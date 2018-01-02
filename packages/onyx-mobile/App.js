// @flow
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { StyleSheet, Text, View, AsyncStorage, Alert, StatusBar } from 'react-native'
import { ApolloProvider } from 'react-apollo'
import type ApolloClient, { createNetworkInterface } from 'apollo-client'
import createClient from './src/data/Apollo'
import * as Keychain from 'react-native-keychain'

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

const SERVER_URL_KEY = 'SERVER_URL'
const CERT_PATH_KEY = 'CERT_PATH'

export default class App extends Component<State> {
  static childContextTypes = {
    httpServerUrl: PropTypes.string.isRequired,
    wsConnected$: PropTypes.object.isRequired,
  }

  state: State = {
    connectionState: 'initializing',
  }

  wsConnected$ = new BehaviorSubject(false)

  getChildContext() {
    return {
      wsConnected$: this.wsConnected$,
      httpServerUrl: 'https://onyx-storage.mainframe.com',
    }
  }

  componentDidMount () {
    this.fetchStoredCreds()
  }

  async fetchStoredCreds () {
    try {
      const serverUrl = await AsyncStorage.getItem(SERVER_URL_KEY)
      const certPath = await AsyncStorage.getItem(CERT_PATH_KEY)
      if (serverUrl && certPath){
        Keychain
          .getGenericPassword()
          .then((credentials) => {
            this.onSelectNode(serverUrl, certPath, credentials.password)
          }).catch((error) => {
            console.warn(error)
          })
      }
    } catch (error) {
      console.log('creds error: ', error)
    }
  }

  async saveServerCreds (url: string, certPath: string, password: string) {
    try {
      await AsyncStorage.setItem(SERVER_URL_KEY, url)
      await AsyncStorage.setItem(CERT_PATH_KEY, certPath)
      Keychain.setGenericPassword(url, password)
    } catch (error) {
      console.warn(error)
    }
  }

  onConnected = async (url: string, certPath: string, certPassword: string) => {
    this.wsConnected$.next(true)
    this.saveServerCreds(url, certPath, certPassword)
  }

  onDisconnected = () => {
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
    const client = await createClient(
      nodeUrl,
      certFilePath,
      certPassword,
      this.onDisconnected,
      this.onConnected,
    )
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
