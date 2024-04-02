import Redis from 'ioredis'

let client = null

export function getCache() {
  if (!client) client = new Redis(process.env.REDIS_URL)
  return client
}

export async function cached(key, ttlSeconds, compute) {
  const c = getCache()
  const hit = await c.get(key)
  if (hit) return JSON.parse(hit)
  const value = await compute()
  await c.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  return value
}
