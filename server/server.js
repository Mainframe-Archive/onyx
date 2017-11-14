// @flow

import debug from 'debug'
import type { PSS } from 'erebos'
import micro, { send } from 'micro'
import cors from 'micro-cors'
import { get, post, router } from 'microrouter'

import createBzzRoutes from './bzz'
import graphqlServer from './graphql/server'

export default (pss: PSS, swarmHttpUrl: string, port: number) => {
  return new Promise((resolve, reject) => {
    const log = debug('dcd:server')
    const bzzRoutes = createBzzRoutes(swarmHttpUrl)
    const graphql = graphqlServer(pss, port)

    const server = micro(
      cors()(
        router(...graphql.routes, ...bzzRoutes, (req, res) =>
          send(res, 404, 'not found'),
        ),
      ),
    )
    server.listen(port, 'localhost', (err: ?Error) => {
      if (err) {
        reject(err)
      } else {
        log(`running on port ${port}`)
        graphql.onCreated(server)
        resolve()
      }
    })
  })
}
