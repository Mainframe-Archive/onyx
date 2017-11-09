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

export default (url: string) =>
  new ApolloClient({
    fragmentMatcher,
    networkInterface: new SubscriptionClient(url, {
      reconnect: true,
    }),
  })
