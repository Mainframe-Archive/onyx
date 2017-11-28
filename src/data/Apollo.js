// @flow

import { ApolloClient, IntrospectionFragmentMatcher } from 'react-apollo'
import { SubscriptionClient } from 'subscriptions-transport-ws'
import path from 'path'

const WebSocket = window.require('ws')
const fs = window.require('fs')
const { app } = window.require('electron').remote

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
  const userDataPath = app.getPath('userData')
  const creds = {}
  try {
    creds.key = fs.readFileSync(path.join(userDataPath, `/certs/client-key.pem`))
    creds.cert = fs.readFileSync(path.join(userDataPath, `/certs/client-crt.pem`))
    creds.ca = fs.readFileSync(path.join(userDataPath, `/certs/ca-crt.pem`))
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
  
  // Also using fork of subscriptions-transport-ws
  // to enable forwarding the cert options to ws
  
  const subClient = new SubscriptionClient(
    url, 
    {
      reconnect: true,
      connectionParams: creds
    },
    WebSocket,
  )
    
  subClient.onDisconnected(() => onDisconnected())
  subClient.onConnected(() => onConnected())    
  return  new ApolloClient({
    fragmentMatcher,
    networkInterface: subClient,
  })
}
