// ─── Shared Utilities ──────────────────────────────────────────────────────────
// Pure utility functions used across the application.
// TODO: Add your own utility functions here.

/**
 * Normalizes a string by removing diacritics and converting to lowercase.
 * Useful for case-insensitive, accent-insensitive text search.
 */
export const normalizeString = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Recursively converts null values to undefined.
 * Useful when bridging between GraphQL (uses null) and TypeScript (prefers undefined).
 */
export const nullToUndefined = <T>(obj: T): T => {
  if (obj === null) return undefined as unknown as T
  if (typeof obj !== 'object') return obj
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, nullToUndefined(v)])
  ) as T
}

/**
 * Extracts the client IP from an Express request.
 * Handles proxies that set X-Forwarded-For.
 */
export const getRequestIp = (req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } }): string | undefined => {
  const forwarded = req.headers['x-forwarded-for']
  if (Array.isArray(forwarded)) return forwarded[0]
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress
}
