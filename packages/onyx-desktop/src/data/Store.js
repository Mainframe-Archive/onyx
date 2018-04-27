// @flow

import { type ApolloClient } from 'react-apollo'
import {
  applyMiddleware,
  combineReducers,
  createStore,
  type Store as ReduxStore,
} from 'redux'
import { createLogger } from 'redux-logger'

import {
  reducer as navigationReducer,
  type NavigationState,
} from './Navigation'

export type State = {
  apollo: Object,
  navigation: NavigationState,
}
export type Store = ReduxStore<State, *>

const EMPTY_STATE = {
  apollo: {},
  navigation: {},
}

export default async (apolloClient: ApolloClient): Promise<Store> => {
  const middlewares = [apolloClient.middleware()]
  if (process.env.NODE_ENV !== 'production') {
    middlewares.push(createLogger())
  }

  // $FlowFixMe
  const store = createStore(
    combineReducers({
      apollo: apolloClient.reducer(),
      navigation: navigationReducer,
    }),
    EMPTY_STATE,
    applyMiddleware(...middlewares),
  )
  return Promise.resolve(store)
}
