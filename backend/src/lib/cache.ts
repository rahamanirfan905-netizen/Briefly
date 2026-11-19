/**
 * Tiny in-process TTL cache with in-flight de-duplication. Good for a single
 * server; on serverless each instance has its own copy, which is still useful
 * and always safe because the database remains the source of truth.
 * (Swap for Redis/Upstash if you need a shared cache.)
 */
const store = new Map<string, { value: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const p = load()
    .then((v) => {
      store.set(key, { value: v, expires: Date.now() + ttlSeconds * 1000 });
      if (store.size > 500) store.delete(store.keys().next().value as string);
      return v;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function cacheClear() {
  store.clear();
}
