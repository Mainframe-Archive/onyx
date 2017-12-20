// @flow
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { StyleSheet, Text, View, AsyncStorage, Alert, StatusBar } from 'react-native'
import { ApolloProvider } from 'react-apollo'
import type ApolloClient, { createNetworkInterface } from 'apollo-client'
import createClient from './src/data/Apollo'
// import { Font } from 'expo'
import {
  applyMiddleware,
  combineReducers,
  type Store as ReduxStore,
} from 'redux'

import createStore, { type Store } from './src/data/Store'
import Navigator from './src/router/Navigator'
import AppReducer from './src/data/reducers'
import NodeSelectionScreen from './src/components/NodeSelectionScreen'

type State = {
  client?: ApolloClient,
  store?: Store,
  selectedNode?: string,
  connectionState?: ?string,
}

export default class App extends Component<State> {
  static childContextTypes = {
    wsConnected$: PropTypes.object.isRequired,
  }

  state: State = {}

  wsConnected$ = new BehaviorSubject(false)

  getChildContext() {
    return {
      wsConnected$: this.wsConnected$,
    }
  }

  onConnected = () => {
    this.wsConnected$.next(true)
		console.log('on connected.....')
  }

  onDisconnected = () => {
    console.log('disconnected...')
    setTimeout(() => {
      this.wsConnected$.next(false)
      this.setState({ connectionState: 'disconnected' })
    }, 100)
  }

  onSelectNode = async (
    nodeUrl: string,
    certFilePath: string,
    certPassword: string,
  ) => {
    console.log('connecting to url: ', nodeUrl)
    const client = await createClient(
      nodeUrl,
      certFilePath,
      certPassword,
      this.onDisconnected
    )
    console.log('created client: ', client)
    if (client && client.networkInterface.client) {
      const store = await createStore(client)
      this.setState({ client, store, connectionState: 'connected' })
    } else {
      Alert.alert(
        `Error connecting to GraphQL server`,
        `Please check you entered a valid url.`,
        [{text: 'OK'}],
      )
    }
  }

  render() {
    const { client, store, connectionState } = this.state
		console.log('rendering, connection error: ', connectionState)
    const content = client && store && connectionState === 'connected' ? (
      <ApolloProvider store={store} client={client}>
        <Navigator />
      </ApolloProvider>
    ) : (
      <NodeSelectionScreen onSelectNode={this.onSelectNode}/>
    )
    return (
      <View style={styles.flex1}>
        <StatusBar barStyle="dark-content" />
        {content}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
