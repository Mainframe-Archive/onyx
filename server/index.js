// @flow

import ip from 'ip'

import { setupPss, setupContactTopic, subscribeToStoredConvos } from './pss/client'
import createServer from './server'

const SWARM_WS_URL = process.env.SWARM_WS_URL || 'ws://localhost:8547'
const SWARM_HTTP_URL = process.env.SWARM_HTTP_URL || 'http://localhost:8500'
const SERVER_PORT = process.env.SERVER_PORT
  ? parseInt(process.env.SERVER_PORT, 10)
  : 5001
const APP_PORT = process.env.APP_PORT
  ? parseInt(process.env.APP_PORT, 10)
  : 3000

const start = async (
  swarmWsUrl: string = SWARM_WS_URL,
  swarmHttpUrl: string = SWARM_HTTP_URL,
  serverPort: number = SERVER_PORT,
  appPort: number = APP_PORT,
) => {
  const appUrl = `http://${ip.address()}:${appPort}`
  // Connect to local Swarm node, this also makes the node's address and public key available in the db module
  const pss = await setupPss(swarmWsUrl, appUrl)
  // Start listening to the "contact request" topic and handle these requests
  await setupContactTopic(pss)
  // Set subscriptions for stored FileData
  await subscribeToStoredConvos(pss)
  // Start the GraphQL server
  await createServer(pss, swarmHttpUrl, serverPort)
}

export default start
