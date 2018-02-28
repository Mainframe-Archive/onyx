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
  address?: string,
  client?: ApolloClient,
  connectionError?: string,
  store?: Store,
  wsUrl?: string,
  testNet?: boolean,
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

    if (params.address) {
      state.address = params.address
    }
    if (params.connectionError) {
      state.connectionError = params.connectionError
    }
    if (params.wsUrl && params.wsUrl !== 'undefined') {
      state.wsUrl = params.wsUrl
    }
    if (params.wsUrl && params.wsUrl !== 'undefined') {
      state.wsUrl = params.wsUrl
    }
    state.testNet = params.testNet
    this.state = state
    this.wsConnected$ = new BehaviorSubject(false)
  }

  componentDidMount() {
    if (this.state.wsUrl && !this.state.connectionError) {
      this.loadStore()
    }
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

  onConnecting = () => {
    this.setState({
      connectionError: undefined,
    })
  }

  connectionCallback = error => {
    let connectionError
    if (error) {
      connectionError =
        'Error connecting to websocket, please check you entered a valid URL\nDEBUG: ' +
        error.toString()
    } else {
      this.wsConnected$.next(true)
    }

    this.setState({ connectionError })
  }

  async loadStore() {
    try {
      const client = createClient(this.state.wsUrl, this.connectionCallback, {
        onDisconnected: this.onDisconnected,
        onConnecting: this.onConnecting,
        onReconnecting: this.onConnecting,
      })
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
    const {
      address,
      client,
      store,
      connectionError,
      testNet,
    } = this.state
    return client && store && !connectionError ? (
      <ApolloProvider client={client} store={store}>
        <App />
      </ApolloProvider>
    ) : (
      <NodeConnectionView
        defaultLocalhostUrl="ws://localhost:5002/graphql"
        storedServerUrl={this.state.wsUrl}
        connectionError={connectionError}
        address={address}
        ethNetwork={testNet ? 'TESTNET' : 'MAINNET'}
      />
    )
  }
}
