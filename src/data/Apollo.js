// @flow

import { ApolloClient, IntrospectionFragmentMatcher } from 'react-apollo'
import { SubscriptionClient } from 'subscriptions-transport-ws'

const WebSocket = window.require('ws')
const Store = window.require('electron-store')
const { is } = window.require('electron-util')
const fs = window.require('fs')

const store = new Store({ name: is.development ? 'onyx-dev' : 'onyx' })

const fragmentMatcher = new IntrospectionFragmentMatcher({
  introspectionQueryResultData: {
    __schema: {
      types: [
        {
          kind: 'UNION',
          name: 'MessageBlock',
          possibleTypes: [
            {
              name: 'MessageBlockText',
            },
            {
              name: 'MessageBlockFile',
            },
            {
              name: 'MessageBlockAction',
            },
          ],
        },
      ],
    },
  },
})

export default (
  url: string,
  onDisconnected: () => void,
  onConnected: () => void,
) => {
  const certPaths = store.get('certs.filePaths')
  const certFiles = {}
  try {
    if (!certPaths) throw new Error('missing tls creds')
    certFiles.key = fs.readFileSync(certPaths.key)
    certFiles.cert = fs.readFileSync(certPaths.cert)
    certFiles.ca = fs.readFileSync(certPaths.ca)
  } catch (err) {
    console.warn(
      `Error reading SSL certs, please make sure you've generated client
      and server ssl certificates using the script provided in Onyx server. `,
      err,
    )
  }

  // Need to provide our own ws implementation
  // as the default subscriptions-transport-ws
  // WebSocket impl doesn't support using tls certs

  class OnyxWebSocket extends WebSocket {

    constructor (url, protocol) {
      super(url, protocol, certFiles)
    }
  }

  const subClient = new SubscriptionClient(
    url,
    {
      reconnect: true,
    },
    OnyxWebSocket,
  )

  subClient.onDisconnected(() => onDisconnected())
  subClient.onConnected(() => onConnected())
  return new ApolloClient({
    fragmentMatcher,
    networkInterface: subClient,
  })
}
