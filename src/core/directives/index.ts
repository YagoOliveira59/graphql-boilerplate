// ─── GraphQL Directives ────────────────────────────────────────────────────────
// Custom schema directives for cross-cutting concerns like authorization.
//
// Included directives:
//   @role(requires: Role!)  — Restricts a field/query/mutation to a specific role
//
// TODO: Add more directives as your needs grow (e.g. @deprecated, @rateLimit, @cacheControl).
// See: https://the-guild.dev/graphql/tools/docs/schema-directives

import { defaultFieldResolver, GraphQLSchema } from 'graphql'
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'

import { APIError } from '@/shared/errors'
import { Context } from '@/shared/types'

// ─── @role directive ──────────────────────────────────────────────────────────

export const roleDirectiveTypeDefs = /* GraphQL */ `
  """
  Restricts access to users with the specified role.
  Roles: ADMIN | USER
  """
  directive @role(requires: Role!) on FIELD_DEFINITION | OBJECT
`

export function roleDirectiveTransformer(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const roleDirective = getDirective(schema, fieldConfig, 'role')?.[0]
      if (!roleDirective) return fieldConfig

      const { requires } = roleDirective
      const { resolve = defaultFieldResolver } = fieldConfig

      return {
        ...fieldConfig,
        resolve: async (source, args, context: Context, info) => {
          const userRole = context.user?.role

          if (!userRole || userRole !== requires) {
            throw new APIError(`Access denied: requires role ${requires}`, {
              extensions: { code: 'FORBIDDEN', http: { status: 403 } }
            })
          }

          return resolve(source, args, context, info)
        }
      }
    }
  })
}
