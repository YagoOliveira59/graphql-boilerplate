// ─── GraphQL Schema Builder ────────────────────────────────────────────────────
// Merges all .graphql type definitions and resolver files from the core folder,
// then applies schema directives.
//
// To add a new entity: create src/core/entities/myEntity/graphql/schema.graphql
// and src/core/entities/myEntity/graphql/resolvers.ts — they are auto-discovered.

import { DIRECTIVES } from '@graphql-codegen/typescript-mongodb'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import path from 'path'

import { roleDirectiveTransformer, roleDirectiveTypeDefs } from '@/core/directives'

// Load all .graphql files recursively from src/core/
const typeDefFiles = loadFilesSync(path.join(__dirname, '../**/*.graphql'), { recursive: true })

export const typeDefs = mergeTypeDefs([
  DIRECTIVES,           // MongoDB codegen directives (@entity, @column, @link, etc.)
  roleDirectiveTypeDefs, // @role directive
  typeDefFiles
])

// Load all resolvers.ts files from entity folders
const resolverFiles = loadFilesSync(path.join(__dirname, './**/resolvers.*'))
export const resolvers = mergeResolvers(resolverFiles)

// Build the executable schema and apply directive transformers
let schema = makeExecutableSchema({ typeDefs, resolvers })
schema = roleDirectiveTransformer(schema)

// TODO: Add more directive transformers here as needed
// schema = myOtherDirectiveTransformer(schema)

export default schema
