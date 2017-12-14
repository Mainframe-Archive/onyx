// @flow
import { combineReducers } from 'redux'
import { NavigationActions } from 'react-navigation'

import { AppNavigator } from '../router/Navigator'

const firstAction = AppNavigator.router.getActionForPathAndParams('Home')
const initialNavState = AppNavigator.router.getStateForAction(firstAction)

const nav = (state = initialNavState, action) => {
  let nextState
  switch (action.type) {
    case 'NAV_OPEN':
      const navAction = NavigationActions.navigate({
        routeName: action.payload.routeName,
        params: { ...action.payload.data },
      })
      nextState = AppNavigator.router.getStateForAction(navAction, state)
      break
    case 'NAV_BACK':
      const backAction = NavigationActions.back({
        key: null
      })
      nextState = AppNavigator.router.getStateForAction(backAction, state)
      break
    default:
      nextState = AppNavigator.router.getStateForAction(action, state)
    }
  return nextState || state
}

export default nav
