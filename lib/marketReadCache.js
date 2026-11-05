if (!global.__marketReadCache) {
  global.__marketReadCache = { data: null, fetchedAt: null, inflightPromise: null };
}

const cache = global.__marketReadCache;

export function getCached() {
  return { data: cache.data, fetchedAt: cache.fetchedAt };
}

export function setCached(payload) {
  cache.data = payload;
  cache.fetchedAt = Date.now();
}

export function getInflight() {
  return cache.inflightPromise;
}

export function setInflight(promise) {
  cache.inflightPromise = promise;
}

export function clearInflight() {
  cache.inflightPromise = null;
}
