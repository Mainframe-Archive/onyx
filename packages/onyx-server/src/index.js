// @flow

import type Conf from 'conf'

import DB from './db'
import {
  setupPss,
  setupContactTopic,
  subscribeToStoredConvos,
} from './pss/client'
import createServer from './server'

const { ONYX_PORT, SWARM_HTTP_URL, SWARM_WS_URL } = process.env

type Options = {
  wsUrl?: string,
  httpUrl?: string,
  store?: Conf,
  port?: number,
  unsecure?: boolean,
}

const start = async (opts: Options) => {
  const httpUrl = opts.httpUrl || SWARM_HTTP_URL || 'https://onyx-storage.mainframe.com'
  const wsUrl = opts.wsUrl || SWARM_WS_URL || 'ws://localhost:8546'
  let port = opts.port
  if (port == null) {
    port = ONYX_PORT == null ? 5000 : parseInt(ONYX_PORT, 10)
  }

  // Setup DB using provided store (optional)
  const db = new DB(opts.store, `onyx-server-${port}`)
  // Connect to local Swarm node, this also makes the node's address and public key available in the db module
  const pss = await setupPss(db, wsUrl)

  // Start listening to the "contact request" topic and handle these requests
  await setupContactTopic(pss, db)
  // Set subscriptions for stored convos
  await subscribeToStoredConvos(pss, db)
  // Start the BZZ and GraphQL server
  const server = await createServer(pss, db, httpUrl, port, !opts.unsecure)
  return server
}

export default start
