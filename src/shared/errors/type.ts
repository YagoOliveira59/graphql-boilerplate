import { GraphQLErrorOptions } from 'graphql'

export type APIErrorOptions = Omit<GraphQLErrorOptions, 'extensions'> & {
  extensions: {
    code: string
    http: {
      status?: number
    }
  }
}
