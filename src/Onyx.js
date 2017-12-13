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
  connectionError?: string,
  store?: Store,
  wsUrl?: string,
}

export default class Onyx extends Component<{}, State> {
  static childContextTypes = {
    httpServerUrl: PropTypes.string.isRequired,
    wsConnected$: PropTypes.object.isRequired,
  }

  getChildContext() {
    return {
      httpServerUrl: 'https://onyx-storage.mainframe.com',
      wsConnected$: this.wsConnected$,
    }
  }

  constructor(props) {
    super(props)

    const params = parse(document.location.search)
    const state = {}

    if (params.connectionError) {
      state.connectionError = params.connectionError
    }
    if (params.wsUrl && params.wsUrl !== 'undefined') {
      state.wsUrl = params.wsUrl
    }

    this.state = state
    this.wsConnected$ = new BehaviorSubject(false)
  }

  componentDidMount() {
    if (this.state.wsUrl) {
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
        this.state.wsUrl,
        this.onDisconnected,
        this.onConnected,
      )
      const store = await createStore(client)
      this.setState({ client, store })
    } catch (err) {
      console.warn('error creating apollo client: ', err)
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
        defaultLocalhostUrl="ws://localhost:5002/graphql"
        storedServerUrl={this.state.wsUrl}
        connectionError={connectionError}
      />
    )
  }
}
