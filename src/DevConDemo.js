// @flow

import PropTypes from 'prop-types'
import { parse } from 'query-string'
import React, { Component } from 'react'
import { ApolloProvider, type ApolloClient } from 'react-apollo'

import App from './components/App'
import Loader from './components/Loader'

import createClient from './data/Apollo'
import createStore, { type Store } from './data/Store'

const DEFAULT_PORT = 5001

type State = { client?: ApolloClient, store?: Store }

export default class DevConDemo extends Component<{}, State> {
  static childContextTypes = {
    serverPort: PropTypes.number.isRequired,
  }

  port: number = DEFAULT_PORT
  state = {}

  getChildContext() {
    return {
      serverPort: this.port,
    }
  }

  componentDidMount() {
    const params = parse(document.location.search)
    this.port = params.port ? parseInt(params.port, 10) : DEFAULT_PORT
    this.loadStore()
  }

  async loadStore() {
    const client = createClient(`ws://localhost:${this.port}/graphql`)
    const store = await createStore(client)
    this.setState({ client, store })
  }

  render() {
    const { client, store } = this.state

    return client && store ? (
      <ApolloProvider client={client} store={store}>
        <App />
      </ApolloProvider>
    ) : (
      <Loader />
    )
  }
}
