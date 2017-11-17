// @flow

import { microGraphiql, microGraphql } from 'apollo-server-micro'
import type { PSS } from 'erebos'
// $FlowFixMe
import { execute, subscribe } from 'graphql'
import { get, post } from 'microrouter'
import type { Server } from 'net'
import { SubscriptionServer } from 'subscriptions-transport-ws'

import type DB from '../db'

import createSchema from './schema'

export default (pss: PSS, db: DB, port: number) => {
  const schema = createSchema(pss, db, port)
  const graphqlHandler = microGraphql({ schema })
  const graphiqlHandler = microGraphiql({ endpointURL: '/graphql' })

  return {
    routes: [
      get('/graphql', graphqlHandler),
      post('/graphql', graphqlHandler),
      get('/graphiql', graphiqlHandler),
    ],
    onCreated: (server: Server) => {
      SubscriptionServer.create(
        { execute, schema, subscribe },
        { path: '/graphql', server },
      )
    },
  }
}
