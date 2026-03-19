// ─── Shared Constants ──────────────────────────────────────────────────────────
// TODO: Add application-wide constants here.

/** Duration (in days) before a session JWT is considered expired. */
export const SESSION_DURATION_DAYS = parseInt(process.env.SESSION_DURATION_DAYS ?? '7')

/**
 * Allowed worker/service identifiers that can authenticate via the /internal endpoint.
 * TODO: Add or remove worker names to match your service mesh.
 */
export const ALLOWED_WORKERS = ['example-worker'] as const
