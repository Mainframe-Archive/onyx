// @flow
import {
	createStore,
	applyMiddleware,
	combineReducers,
	type Store as ReduxStore,
} from 'redux'
import { AsyncStorage } from 'react-native'
import { createPersistor, getStoredState } from 'redux-persist'
import { type ApolloClient } from 'react-apollo'
import { createLogger } from 'redux-logger'

import reducer from '../data/reducers'

export type State = {
	apollo: Object,
	nav: Object,
  nodeUrls: Array<string>,
}

const CONFIG = {
	storage: AsyncStorage,
}

const EMPTY_STATE = {
	apollo: {},
}

const RESET_NAV = {
  index: 0,
  routes: [{
    key: 'home',
    routeName: 'Home',
  }]
}

const resetNav = true

const getInitialState = (): Promise<State> => {
	return new Promise(resolve => {
		getStoredState(CONFIG, (err, state = {}) => {
			if (err) {
				console.warn('Failed loading stored state')
			}
			resolve({ ...EMPTY_STATE, ...state, apollo: {} })
		})
	})
}

export default async (apolloClient: ApolloClient): Promise<Store> => {
	const state = await getInitialState()
  if (resetNav) {
    state.nav = RESET_NAV
  }
	const store = createStore(
		combineReducers({
			apollo: apolloClient.reducer(),
			nav: reducer,
		}),
		state,
		applyMiddleware(apolloClient.middleware()),
	)
  createPersistor(store, CONFIG)
  return store
}
