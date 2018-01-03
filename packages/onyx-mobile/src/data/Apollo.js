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
  certFilePath: string,
  certPassword: string,
  onDisconnected: () => void,
  onConnected: (url: string, certPath: string, certPassword: string) => void,
) => {
  let certBase64
  try {
    certBase64 = await RNFS.readFile(certFilePath, 'base64')
  } catch (err) {
    console.log('cert read err: ', err)
    throw err
  }

  class CustomWebSocket extends OnyxWebSocket {
    constructor (url, protocol) {
      super(url, protocol, {}, certBase64, certPassword)
    }
  }

  const wsClient = new SubscriptionClient(url, {}, CustomWebSocket)

  wsClient.onDisconnected(() => onDisconnected())
  wsClient.onConnected(() => onConnected(url, certFilePath, certPassword))
  return new ApolloClient({
    fragmentMatcher,
    networkInterface: wsClient,
  })
}
