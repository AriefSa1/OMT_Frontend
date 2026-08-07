'use client';

const cache = new Map();
const CACHE_INVALIDATE_EVENT = 'snapshot-cache-invalidate';

// Cross-tab cache invalidation: when one tab dispatches a sync or clears a cache
// prefix, other tabs listening on the 'storage' event will drop the same keys.
// This prevents stale data being shown for up to the full TTL (20-60s) after a
// sync completes on another tab/window.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== CACHE_INVALIDATE_EVENT || !event.newValue) return;
    const prefix = event.newValue || '';
    console.debug(`[QueryCache] Cross-tab invalidation received: "${prefix}"`);
    invalidateSnapshotCache(prefix);
  });
}

export async function readCached(key, loader, ttl = 30000) {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing?.data !== undefined && now - existing.updatedAt < ttl) return existing.data;
  if (existing?.promise) return existing.promise;

  const promise = Promise.resolve(loader())
    .then((data) => {
      // lib/api.js resolves (rather than throws) on HTTP errors, so a failure arrives
      // here looking like ordinary data. Caching it would pin the error for the whole
      // TTL and make every retry a cache hit that never touches the network.
      if (data && data.success === false) {
        cache.delete(key);
        return data;
      }
      cache.set(key, { data, updatedAt: Date.now() });
      return data;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, { ...(existing || {}), promise });
  return promise;
}

export function invalidateSnapshotCache(prefix = '') {
  for (const key of cache.keys()) {
    if (!prefix || key.startsWith(prefix)) cache.delete(key);
  }
  // Broadcast to other tabs so they can invalidate their caches too
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(CACHE_INVALIDATE_EVENT, prefix);
    setTimeout(() => localStorage.removeItem(CACHE_INVALIDATE_EVENT), 1000);
  }
}
