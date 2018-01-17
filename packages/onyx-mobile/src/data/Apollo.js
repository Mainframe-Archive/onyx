// @flow

import { IntrospectionFragmentMatcher } from 'react-apollo'
import ApolloClient, { createNetworkInterface } from 'apollo-client'
import { SubscriptionClient } from 'subscriptions-transport-ws'
import RNFS from 'react-native-fs'

import OnyxWebSocket from '../OnyxWebSocket'

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

export default async (
  url: string,
  clientCertFilePath: string,
  clientCertPassword: string,
  caCertFilePath: string,
  onDisconnected: () => void,
  onConnected: (
    url: string,
    clientCertFilePath: string,
    certPassword: string,
    caCertFilePath: string
  ) => void,
  onError?: (err: Object) => void,
) => {
  class CustomWebSocket extends OnyxWebSocket {
    constructor (url, protocol) {
      super(url, protocol, {}, clientCertFilePath, clientCertPassword, caCertFilePath)
    }
  }

  const wsClient = new SubscriptionClient(url, {
    wsTimeout: 5000,
  }, CustomWebSocket)

  wsClient.onDisconnected(() => onDisconnected())
  wsClient.onConnected(() => onConnected(url, clientCertFilePath, clientCertPassword, caCertFilePath))
  const client = new ApolloClient({
    fragmentMatcher,
    networkInterface: wsClient,
  })
  if (onError) {
    wsClient.client.onerror = (err: Object) => {
      onError(err)
    }
  }
  return client
}
