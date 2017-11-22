// @flow

import { ApolloClient, IntrospectionFragmentMatcher } from 'react-apollo'
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

export default (
  url: string,
  onDisconnected: () => void,
  onConnected: () => void,
) => {
  const subClient = new SubscriptionClient(url, {
    reconnect: true,
  })
  subClient.onDisconnected(() => onDisconnected())
  subClient.onConnected(() => onConnected())    
  return  new ApolloClient({
    fragmentMatcher,
    networkInterface: subClient,
  })
}

