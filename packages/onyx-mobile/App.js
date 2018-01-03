// @flow
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import {
  StyleSheet,
  Text,
  View,
  AsyncStorage,
  Alert,
  StatusBar,
} from 'react-native'
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
import Loader from './src/components/shared/Loader'

type ConnectionState = 'initializing' | 'connecting' | 'disconnected' | 'connected'

type State = {
  client?: ApolloClient,
  store?: Store,
  selectedNode?: string,
  connectionState?: ConnectionState,
}

export const SERVER_URL_KEY = 'SERVER_URL'
export const CERT_PATH_KEY = 'CERT_PATH'

export default class App extends Component<State> {
  static childContextTypes = {
    logout: PropTypes.func.isRequired,
    httpServerUrl: PropTypes.string.isRequired,
    wsConnected$: PropTypes.object.isRequired,
  }

  state: State = {
    connectionState: 'initializing',
  }

  wsConnected$ = new BehaviorSubject(false)
  disconnectedTimer: ?number

  getChildContext() {
    return {
      wsConnected$: this.wsConnected$,
      httpServerUrl: 'https://onyx-storage.mainframe.com',
      logout: () => {
        this.onLogout()
      }
    }
  }

  componentWillUnmount() {
    clearTimeout(this.disconnectedTimer)
  }

  componentDidMount () {
    this.fetchStoredCreds()
  }

  onLogout = () => {
    this.clearCreds()
  }

  clearCreds = async () => {
    await AsyncStorage.multiRemove([SERVER_URL_KEY, CERT_PATH_KEY])
    this.setState({ connectionState: 'disconnected' })
  }

  async fetchStoredCreds () {
    try {
      const stored = await AsyncStorage.multiGet([SERVER_URL_KEY, CERT_PATH_KEY])
      const serverUrl = stored[0][1]
      const certPath = stored[1][1]
      if (serverUrl && certPath){
        const credentials = await Keychain.getGenericPassword()
        this.onSelectNode(serverUrl, certPath, credentials.password)
        return
      }
    } catch (error) {
      console.warn(error)
    }
    this.setDisconnected()
  }

  async saveServerCreds (url: string, certPath: string, password: string) {
    try {
      await AsyncStorage.multiSet([[SERVER_URL_KEY, url], [CERT_PATH_KEY, certPath]])
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
    this.disconnectedTimer = setTimeout(() => {
      this.wsConnected$.next(false)
      this.setDisconnected()
    }, 100)
  }

  setDisconnected () {
    this.setState({
      connectionState: 'disconnected',
    })
  }

  onSelectNode = async (
    nodeUrl: string,
    certFilePath: string,
    certPassword: string,
  ) => {
    try {
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
        throw new Error('connection error')
      }
    } catch (err) {
      Alert.alert(
        `Error connecting to GraphQL server`,
        `Please check you entered a valid url.`,
        [{text: 'OK'}],
      )
      this.setDisconnected()
    }
  }

  render() {
    const { client, store, connectionState } = this.state
    if (connectionState === 'initializing') {
      return (
        <View style={styles.flex1}>
          <Loader />
        </View>
      )
    }
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
