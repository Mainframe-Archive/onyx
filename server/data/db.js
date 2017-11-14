// @flow

import debug from 'debug'
import Store from 'electron-store'
import pubsub from './pubsub'
import { merge } from 'lodash'

import type { ByteArray } from '../pss/types'

const TYPING_TIMEOUT = 10000 // 10 secs in ms

const log = debug('dcd:db')

export type ID = string

export type Profile = {
  id: ID, // base64-encoded public key
  avatar?: ?string,
  name?: ?string,
}

export type ActionState = 'PENDING' | 'DONE'

export type ActionData = {
  id: ID, // UUID for the action
  assignee: ID, // public key
  sender: ID, // public key
  state: ActionState,
  text: string,
}

export type MessageBlockAction = {
  action: ActionData,
}

export type FileData = {
  name: string,
  url: string,
  contentType?: string,
  size?: number,
}

export type MessageBlockFile = {
  file: FileData,
}

export type MessageBlockText = {
  text: string,
}

export type MessageBlock =
  | MessageBlockAction
  | MessageBlockFile
  | MessageBlockText

export type MessageSource = 'SYSTEM' | 'USER'

export type Message = {
  sender: ID, // Address
  blocks: Array<MessageBlock>,
  source: MessageSource,
  timestamp: number,
}

export type SendMessage = {
  sender?: ?ID,
  blocks: Array<MessageBlock>,
  source?: ?MessageSource,
  timestamp?: ?number,
}

export type ConvoType = 'CHANNEL' | 'DIRECT'

export type Conversation = {
  id: ID, // Topic hex
  lastActiveTimestamp: number,
  messages: Array<Message>,
  messageCount: number,
  // $FlowIgnore
  peers: Array<ID>,
  type: ConvoType,
  pointer: number,
  subject?: ?string,
}

export type ConversationData = {
  id: ID, // Topic hex
  lastActiveTimestamp: number,
  messages: Array<Message>,
  messageCount: number,
  // $FlowIgnore
  peers: Array<Contact | ContactData>,
  type: ConvoType,
  pointer: number,
  subject?: ?string,
}

export type ContactState = 'ACCEPTED' | 'RECEIVED' | 'SENT'

export type Contact = {
  profile: Profile,
  address?: ?string,
  convoID?: ?ID,
  state?: ?ContactState,
}

export type ContactData = {
  profile: Profile,
  address?: ?string,
  convoID?: ?ID,
  convo?: ?Conversation,
  state?: ?ContactState,
}

export type ContactRequest = {
  address: string,
  topic: ByteArray,
}

type Viewer = {
  channels: Array<ConversationData>,
  contacts: Array<ContactData>,
  profile: ?Profile,
}

export type Action = {
  convoID: ID,
  data: ActionData,
}

type Timer = number
type ConvoTypings = { [ID]: Timer } // keyed by peer ID

type State = {
  actions: { [ID]: Action },
  address: string,
  contactRequests: { [ID]: ContactRequest },
  contacts: { [ID]: Contact },
  convos: { [ID]: Conversation },
  profile: ?Profile,
}

const store = new Store()

const resetState = () => {
  store.set('state', {
    actions: {},
    address: '',
    contactRequests: {},
    contacts: {},
    convos: {},
    // TODO: store profiles mock as [address]: PeerProfile
    // get own profile based on address
    profile: undefined,
  })
}

if (!store.has('state')) {
  resetState()
}

const _typings: Map<ID, ConvoTypings> = new Map()

const resetTyping = (convoID: ID, peerID: ID) => {
  return setTimeout(setTyping, TYPING_TIMEOUT, convoID, peerID, false)
}

const setTypings = (convoID: ID, convoTypings: ConvoTypings) => {
  _typings.set(convoID, convoTypings)
  const peers = Array.from(convoTypings.keys()).reduce((acc, id) => {
    const contact = getContact(id)
    if (contact) {
      acc.push(contact)
    }
    return acc
  }, [])
  pubsub.publish('typingsChanged', { id: convoID, peers })
  return peers
}

export const setTyping = (convoID: ID, peerID: ID, typing: boolean) => {
  let convoTypings = _typings.get(convoID)
  if (convoTypings == null) {
    convoTypings = new Map()
    if (typing) {
      convoTypings.set(peerID, resetTyping(convoID, peerID))
      return setTypings(convoID, convoTypings)
    } // Otherwise nothing to do
  } else {
    // Discard existing timer if set
    const peerTimer = convoTypings.get(peerID)
    if (peerTimer != null) {
      clearTimeout(peerTimer)
      convoTypings.delete(peerID)
    }
    if (typing) {
      convoTypings.set(peerID, resetTyping(convoID, peerID))
    }
    return setTypings(convoID, convoTypings)
  }
}

export const setAddress = (address: string = '') => {
  store.set('state.address', address)
}

export const getAddress = (): string => store.get('state.address')

export const setProfile = (profile: Profile) => {
  const id = store.get('state.profile.id')
  if (id != null && id !== profile.id) {
    resetState()
  }
  store.set('state.profile', profile)
}

export const getProfile = (): ?Profile => store.get('state.profile')

export const deleteContactRequest = (id: ID) => {
  store.delete(`state.contactRequests.${id}`)
}

export const getContactRequest = (id: ID) => {
  return store.get(`state.contactRequests.${id}`)
}

export const setContactRequest = (
  contact: Contact,
  request: ContactRequest,
) => {
  log('set contact request', contact, request)
  store.set(`state.contacts.${contact.profile.id}`, contact)
  store.set(`state.contactRequests.${contact.profile.id}`, request)
  pubsub.publish('contactsChanged', getContacts())
  pubsub.publish('contactRequested', contact.profile)
}

export const getAction = (id: ID): ?Action => store.get(`state.actions.${id}`)

export const setAction = (convoID: ID, data: ActionData): Action => {
  const action = { convoID, data }
  store.set(`state.actions.${data.id}`, action)
  return action
}

export const getConversation = (
  id: ID,
  withContacts: boolean = false,
): ?(Conversation | ConversationData) => {
  const convo = store.get(`state.convos.${id}`)
  if (convo) {
    const messages =
      convo.messages && convo.messages.length
        ? convo.messages.map(msg => {
            msg.blocks = msg.blocks.map(b => {
              if (b.action != null && typeof b.action.id === 'string') {
                const action = store.get(`state.actions.${b.action.id}`)
                if (action != null) {
                  // $FlowIgnore
                  b.action = action.data
                }
              }
              return b
            })
            return msg
          })
        : []
    // $FlowFixMe
    return {
      ...convo,
      messages,
      peers: withContacts ? convo.peers.map(id => getContact(id)) : convo.peers,
    }
  }
}

export const getContact = (
  id: ID,
  withConvo: boolean = false,
): ?(Contact | ContactData) => {
  const contact = store.get(`state.contacts.${id}`)
  if (contact) {
    const convo =
      withConvo && contact.convoID != null
        ? getConversation(contact.convoID)
        : undefined
    // $FlowFixMe
    return { ...contact, convo }
  }
}

export const getContacts = (withConvo: boolean = false) => {
  const storedContacts = store.get('state.contacts')
  return Object.keys(storedContacts).map(id => getContact(id, withConvo))
}

export const getConversations = (filterType?: ConvoType) => {
  const storedConvos = store.get('state.convos')
  const convos = Object.keys(storedConvos).map(id => getConversation(id, true))
  return filterType ? convos.filter(c => c && c.type === filterType) : convos
}

export const getChannels = () => getConversations('CHANNEL')

// $FlowFixMe
export const getViewer = (): Viewer => ({
  channels: getChannels(),
  contacts: getContacts(true),
  profile: getProfile(),
})

export const setContact = (contact: Contact) => {
  store.set(`state.contacts.${contact.profile.id}`, contact)
  log('set contact', contact)
  pubsub.publish('contactChanged', getContact(contact.profile.id, true))
  pubsub.publish('contactsChanged')
}

export const hasConversation = (convoId: Conversation) => {
  return store.has(`state.convos.${convoId}`)
}

export const setConversation = (convo: Conversation) => {
  store.set(`state.convos.${convo.id}`, convo)
  log('set convo', convo)
  pubsub.publish(
    convo.type === 'CHANNEL' ? 'channelsChanged' : 'contactsChanged',
  )
}

export const updateConversationPointer = (id: ID): ?Conversation => {
  const convo = store.get(`state.convos.${id}`)
  if (convo != null && convo.pointer != convo.messages.length) {
    convo.lastActiveTimestamp = Date.now()
    convo.pointer = convo.messages.length
    setConversation(convo)
  }
  return convo
}

export const upsertContact = (contact: Contact) => {
  const existing = getContact(contact.profile.id)
  setContact(existing ? merge({}, existing, contact) : contact)
}

export const addMessage = (
  id: ID,
  msg: Message | SendMessage,
  fromSelf: boolean = false,
): ?Message => {
  const convo = getConversation(id)
  if (convo == null) {
    log('invalid addMessage call: conversation not found', id)
    return
  }

  if (fromSelf) {
    const profile = getProfile()
    if (profile == null || profile.id == null) {
      log('invalid addMessage call from self: profile ID is not defined')
      return
    }
    msg.sender = profile.id
  }

  if (msg.source == null) {
    msg.source = 'USER'
  }
  msg.timestamp = convo.lastActiveTimestamp = Date.now()

  // $FlowFixMe
  const actionBlock = msg.blocks.find(b => b.action != null)
  if (actionBlock != null) {
    // $FlowFixMe
    setAction(id, actionBlock.action)
  }

  const messages = convo.messages || []
  // $FlowFixMe
  messages.push(msg)
  convo.messages = messages
  convo.messageCount = messages.length

  if (fromSelf) {
    convo.pointer = messages.length
  }

  setConversation(convo)
  pubsub.publish('messageAdded', { id, message: msg })
  // $FlowFixMe
  return msg
}
