// @flow

import type { State } from './Store'

export type NavigationState = {
  openChannel?: ?string,
  openContact?: ?string,
}

// Actions

export const setOpenChannel = (channel: string) => ({
  type: 'NAVIGATION_OPEN_CHANNEL',
  channel,
})

export const setOpenContact = (contact: string) => ({
  type: 'NAVIGATION_OPEN_CONTACT',
  contact,
})

// Selectors

export const getOpenChannel = (state: State) => state.navigation.openChannel
export const getOpenContact = (state: State) => state.navigation.openContact

// Reducer

export const reducer = (state: NavigationState = {}, action: Object) => {
  switch (action.type) {
    case 'NAVIGATION_OPEN_CHANNEL':
      return { ...state, openChannel: action.channel, openContact: undefined }
    case 'NAVIGATION_OPEN_CONTACT':
      return { ...state, openChannel: undefined, openContact: action.contact }
    default:
      return state
  }
}
