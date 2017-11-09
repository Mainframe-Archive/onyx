// @flow

import debug from 'debug'
import { merge } from 'lodash'

import pubsub from './pubsub'

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
type ConvoTypings = Map<ID, Timer> // keyed by peer ID

type DB = {
  actions: Map<ID, Action>,
  address: string,
  contactRequests: Map<ID, ContactRequest>,
  contacts: Map<ID, Contact>,
  convos: Map<ID, Conversation>,
  profile: ?Profile,
  typings: Map<ID, ConvoTypings>,
}

const db: DB = {
  actions: new Map(),
  address: '',
  contactRequests: new Map(),
  contacts: new Map(),
  convos: new Map(),
  // TODO: store profiles mock as [address]: PeerProfile
  // get own profile based on address
  profile: undefined,
  typings: new Map(),
}

const resetTyping = (convoID: ID, peerID: ID) =>
  setTimeout(setTyping, TYPING_TIMEOUT, convoID, peerID, false)

const setTypings = (convoID: ID, typings: ConvoTypings) => {
  db.typings.set(convoID, typings)
  const peers = Array.from(typings.keys()).map(id => getContact(id))

  pubsub.publish('typingsChanged', { id: convoID, peers })
  return peers
}

export const setTyping = (convoID: ID, peerID: ID, typing: boolean) => {
  let convoTypings = db.typings.get(convoID)
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
  db.address = address
}

export const getAddress = (): string => db.address

export const setProfile = (profile: Profile) => {
  db.profile = profile
}

export const getProfile = (): ?Profile => db.profile

export const deleteContactRequest = (id: ID) => db.contactRequests.delete(id)

export const getContactRequest = (id: ID) => db.contactRequests.get(id)

export const setContactRequest = (
  contact: Contact,
  request: ContactRequest,
) => {
  log('set contact request', contact, request)
  db.contacts.set(contact.profile.id, contact)
  db.contactRequests.set(contact.profile.id, request)
  pubsub.publish('contactsChanged', getContacts())
  pubsub.publish('contactRequested', contact.profile)
}

export const getAction = (id: ID): ?Action => db.actions.get(id)

export const setAction = (convoID: ID, data: ActionData): Action => {
  const action = { convoID, data }
  db.actions.set(data.id, action)
  return action
}

export const getConversation = (
  id: ID,
  withContacts: boolean = false,
): ?(Conversation | ConversationData) => {
  const convo = db.convos.get(id)
  if (convo) {
    const messages =
      convo.messages && convo.messages.length
        ? convo.messages.map(msg => {
            msg.blocks = msg.blocks.map(b => {
              if (b.action != null && typeof b.action.id === 'string') {
                const action = db.actions.get(b.action.id)
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
  const contact = db.contacts.get(id)
  if (contact) {
    const convo =
      withConvo && contact.convoID != null
        ? getConversation(contact.convoID)
        : undefined
    // $FlowFixMe
    return { ...contact, convo }
  }
}

export const getContacts = (withConvo: boolean = false) =>
  Array.from(db.contacts.keys()).map(id => getContact(id, withConvo))

export const getConversations = (filterType?: ConvoType) => {
  const convos = Array.from(db.convos.keys()).map(id =>
    getConversation(id, true),
  )
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
  db.contacts.set(contact.profile.id, contact)
  log('set contact', contact)
  pubsub.publish('contactChanged', getContact(contact.profile.id, true))
  pubsub.publish('contactsChanged')
}

export const setConversation = (convo: Conversation) => {
  db.convos.set(convo.id, convo)
  log('set convo', convo)
  pubsub.publish(
    convo.type === 'CHANNEL' ? 'channelsChanged' : 'contactsChanged',
  )
}

export const updateConversationPointer = (id: ID): ?Conversation => {
  const convo = db.convos.get(id)
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
    if (db.profile == null || db.profile.id == null) {
      log('invalid addMessage call from self: profile ID is not defined')
      return
    }
    msg.sender = db.profile.id
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

export default db
