
const CACHE_MAX = 200
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

const cache = new Map()

const isExpired = (entry) => Date.now() - entry.createdAt > CACHE_TTL_MS

const evictOldest = () => {
  if (cache.size <= CACHE_MAX) return

  const oldestKey = cache.keys().next().value
  cache.delete(oldestKey)
}

export const getCachedEmbedding = (key) => {
  const normalizedKey = String(key).trim().toLowerCase()
  const entry = cache.get(normalizedKey)

  if (!entry) return null
  if (isExpired(entry)) {
    cache.delete(normalizedKey)
    return null
  }

  cache.delete(normalizedKey)
  cache.set(normalizedKey, entry)

  return entry.vector
}

export const setCachedEmbedding = (key, vector) => {
  const normalizedKey = String(key).trim().toLowerCase()

  cache.set(normalizedKey, {
    vector,
    createdAt: Date.now()
  })

  evictOldest()
}

export const getCacheStats = () => ({
  size: cache.size,
  maxSize: CACHE_MAX,
  ttlMs: CACHE_TTL_MS
})
