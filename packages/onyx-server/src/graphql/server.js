// @flow

import type { PSS } from 'erebos'
import debug from 'debug'
// $FlowFixMe
import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import bodyParser from 'body-parser'
import { graphiqlExpress, graphqlExpress } from 'apollo-server-express'

import type DB from '../db'

import createSchema from './schema'

export default (pss: PSS, db: DB, port: number, app: express$Application) => {
  const schema = createSchema(pss, db, port)
  const log = debug('onyx:graphql')

  app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))
  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
  }))

  return {
    schema,
    onCreated: (server: express$Application ) => {
      SubscriptionServer.create(
        {
          execute,
          schema,
          subscribe,
        },
        { path: '/graphql', server },
      )
    },
  }
}
