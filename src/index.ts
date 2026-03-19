// ─── Entry point ──────────────────────────────────────────────────────────────
// Bootstraps all connections and starts the Apollo/Express server.
// Import order matters: mongoose/redis/pubsub must be imported before the server
// so their connection side-effects run at startup.

import { startApolloServer } from '@/lib/apollo'
import '@/lib/mongoose'
import '@/lib/pubsub'
import '@/lib/redis'

if (!process.env.PORT) throw new Error('Environment variable PORT not set')
const port = parseInt(process.env.PORT)

;(async () => {
  await startApolloServer({ port })
})()
