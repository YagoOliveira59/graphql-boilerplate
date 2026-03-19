// ─── Authorization Constants ───────────────────────────────────────────────────

/**
 * Minutes before token expiry where a refresh is required.
 * If a token has fewer than this many minutes remaining, it will be refreshed.
 * TODO: Adjust to match your session strategy.
 */
export const TOKEN_TOLERANCE_MINUTES = 10
