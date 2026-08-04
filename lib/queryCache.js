'use client';

const cache = new Map();

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
}
