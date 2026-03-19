// ─── Redis Client & Caching Utilities ─────────────────────────────────────────
// Provides a connected Redis client and helper functions for key-value and
// hash-map caching with optional TTL (time-to-live in seconds).
//
// Usage:
//   await cacheSave({ key: 'user', prefix: 'auth', value: userData, ttl: 300 })
//   const user = await cacheRead<UserData>('user', 'auth')

import { createClient } from 'redis'

import logger from '@/lib/winston'

if (!process.env.REDIS_URL) throw new Error('Environment variable REDIS_URL not set')
const url = process.env.REDIS_URL

const client = createClient({ url }).on('error', (err) => logger.error('[Redis] Client error', err))

client.connect().then(() => logger.info('[Redis] Connected'))

/** Encodes any value to a JSON string for storage in Redis. */
export const encodeValue = <valueT>(value: valueT): string => JSON.stringify(value)

const decodeValue = <valueT>(encoded: string): valueT => JSON.parse(encoded)

/**
 * Saves a value in Redis under `prefix:key`.
 * @param ttl - Time-to-live in seconds (default: 300)
 */
export const cacheSave = async <valueT>({
  key,
  prefix,
  value,
  ttl = 300
}: {
  key: string
  prefix: string
  value: valueT
  ttl?: number
}): Promise<boolean | string | null> => {
  if (client.isReady) {
    const encodedValue = encodeValue<valueT>(value)
    const fullKey = `${prefix}:${key}`
    return client.set(fullKey, encodedValue, { EX: ttl })
  }
  return false
}

/** Reads and deserializes a value from Redis. Returns null if not found. */
export const cacheRead = async <valueT>(key: string, prefix: string): Promise<valueT | null> => {
  if (client.isReady) {
    const fullKey = `${prefix}:${key}`
    const encodedValue = await client.get(fullKey)
    return encodedValue ? decodeValue<valueT>(encodedValue) : null
  }
  return null
}

/** Saves multiple fields to a Redis hash map under `prefix:key`. */
export const cacheHashSave = async ({
  key,
  prefix,
  fields,
  ttl
}: {
  key: string
  prefix: string
  fields: Record<string, string>
  ttl?: number
}): Promise<boolean> => {
  if (client.isReady) {
    const fullKey = `${prefix}:${key}`
    await client.hSet(fullKey, fields)
    if (ttl) {
      await client.expire(fullKey, ttl)
    }
    return true
  }
  return false
}

/** Reads all fields from a Redis hash map. Returns null if not found. */
export const cacheHashRead = async (key: string, prefix: string): Promise<Record<string, string> | null> => {
  if (client.isReady) {
    const fullKey = `${prefix}:${key}`
    const fields = await client.hGetAll(fullKey)
    return Object.keys(fields).length > 0 ? fields : null
  }
  return null
}

/** Deletes a key from Redis. Returns true if the key existed. */
export const cacheDelete = async (key: string, prefix: string): Promise<boolean> => {
  if (client.isReady) {
    const fullKey = `${prefix}:${key}`
    const result = await client.del(fullKey)
    return result > 0
  }
  return false
}

export default client
