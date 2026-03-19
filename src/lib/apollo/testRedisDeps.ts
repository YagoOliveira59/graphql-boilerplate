// ─── Test Redis Dependencies ───────────────────────────────────────────────────
// Allows tests to inject mock Redis dependencies into the Apollo server context
// without modifying the production code path.
//
// Usage in tests:
//   setTestRedisDeps({ cacheRead: sinon.stub(), cacheSave: sinon.stub(), cacheDelete: sinon.stub() })
//   // ... run test ...
//   setTestRedisDeps(undefined) // reset

import { cacheDelete, cacheRead, cacheSave } from '@/lib/redis'

export type RedisDeps = {
  cacheRead: typeof cacheRead
  cacheSave: typeof cacheSave
  cacheDelete: typeof cacheDelete
}

let testRedisDeps: RedisDeps | undefined

/** Overrides Redis functions used in context/auth — for testing only. */
export const setTestRedisDeps = (deps: RedisDeps | undefined) => {
  testRedisDeps = deps
}

/** Returns the current (possibly mocked) Redis dependency set. */
export const getTestRedisDeps = (): RedisDeps => {
  return testRedisDeps ?? { cacheRead, cacheSave, cacheDelete }
}
