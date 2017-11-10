// @flow

import { setupPss, setupContactTopic } from './pss/client'
import createServer from './server'

const start = async (
  swarmWsUrl: string,
  swarmHttpUrl: string,
  serverPort: number,
  appPort: number,
) => {
  // Connect to local Swarm node, this also makes the node's address and public key available in the db module
  const pss = await setupPss(swarmWsUrl, `http://localhost:${appPort}`)
  // Start listening to the "contact request" topic and handle these requests
  await setupContactTopic(pss)
  // Start the GraphQL server
  await createServer(pss, swarmHttpUrl, serverPort)
}

export default start
