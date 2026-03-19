// ─── Example Resolvers ─────────────────────────────────────────────────────────
// Combines query and mutation resolvers for the Example entity.
// This file is auto-discovered by the schema merger in src/core/index.ts.

import { createExample, deleteExample, updateExample } from '@/core/entities/example/graphql/mutations'
import { example, examples } from '@/core/entities/example/graphql/queries'

const resolvers = {
  Query: {
    examples,
    example
  },
  Mutation: {
    createExample,
    updateExample,
    deleteExample
  }
  // TODO: Add field resolvers here if needed (e.g. Example.someVirtualField)
}

export default resolvers
