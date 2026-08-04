'use client';

const cache = new Map();

export async function readCached(key, loader, ttl = 30000) {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing?.data !== undefined && now - existing.updatedAt < ttl) return existing.data;
  if (existing?.promise) return existing.promise;

  const promise = Promise.resolve(loader())
    .then((data) => {
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
