// @flow

import PropTypes from 'prop-types'
import { parse } from 'query-string'
import React, { Component } from 'react'
import { ApolloProvider, type ApolloClient } from 'react-apollo'
import { BehaviorSubject } from 'rxjs'

import App from './components/App'
import NodeConnectionView from './components/NodeConnectionView'

import createClient from './data/Apollo'
import createStore, { type Store } from './data/Store'

type State = {
  client?: ApolloClient,
  store?: Store,
  serverLocation?: string,
}

export default class DevConDemo extends Component<{}, State> {
  static childContextTypes = {
    httpServerUrl: PropTypes.string.isRequired,
    wsConnected$: PropTypes.object.isRequired,
  }

  httpServerUrl: string

  getChildContext() {
    return {
      httpServerUrl: this.httpServerUrl,
      wsConnected$: this.wsConnected$,
    }
  }

  constructor(props) {
    super(props)

    const params = parse(document.location.search)
    let state = {}

    if (params.serverUrl && params.serverUrl !== 'undefined') {
      let serverLocation = params.serverUrl
      if (serverLocation.indexOf('://') > -1) {
        serverLocation = serverLocation.split('/')[2]
      } else if (serverLocation.indexOf('/') !== -1) {
        serverLocation = serverLocation.split('/')[0]
      }
      this.wsServerUrl = `wss://${serverLocation}/graphql`
      this.httpServerUrl = `http://${serverLocation}`

      state.serverLocation = serverLocation
      if (params.connectionError) {
        state.connectionError = params.connectionError
      }
    }
    this.state = state

    this.wsConnected$ = new BehaviorSubject(false)
  }

  componentDidMount() {
    if (this.wsServerUrl) {
      this.loadStore()
    }
  }

  onConnected = () => {
    this.wsConnected$.next(true)
  }

  onDisconnected = () => {
    if (!this.state.connectionError) {
      const message = this.wsConnected$.value
        ? 'Lost connection to server, please reconnect'
        : 'Error connecting to websocket, please check you entered a valid URL'

      this.wsConnected$.next(false)

      this.setState({
        connectionError: message,
      })
    }
  }

  async loadStore() {
    try {
      const client = createClient(
        this.wsServerUrl,
        this.onDisconnected,
        this.onConnected,
      )
      const store = await createStore(client)
      this.setState({ client, store })
    } catch (err) {
      this.setState({
        connectionError:
          'Error connecting to server, please check you entered a valid URL',
      })
    }
  }

  render() {
    const { client, store, connectionError } = this.state
    return client && store && !connectionError ? (
      <ApolloProvider client={client} store={store}>
        <App />
      </ApolloProvider>
    ) : (
      <NodeConnectionView
        defaultLocalhostUrl="http://localhost:5002/graphql"
        storedServerUrl={this.state.serverLocation}
        connectionError={connectionError}
      />
    )
  }
}
