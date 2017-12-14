// @flow

import { IntrospectionFragmentMatcher } from 'react-apollo'
import ApolloClient, { createNetworkInterface } from 'apollo-client'
import { SubscriptionClient } from 'subscriptions-transport-ws'

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

export default async (url: string, onDisconnected: () => void) => {
  const wsClient = new SubscriptionClient(url, {
    reconnect: true,
  })
  wsClient.onDisconnected(() => onDisconnected())
  return new ApolloClient({
    fragmentMatcher,
    networkInterface: wsClient,
  })
}
