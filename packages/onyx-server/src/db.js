// @flow

import Conf from 'conf'
import debug from 'debug'
import type { topic } from 'erebos'
import { PubSub } from 'graphql-subscriptions'
import { merge } from 'lodash'

const TYPING_TIMEOUT = 10000 // 10 secs in ms

const log = debug('onyx:db')

export type ID = string

export type Profile = {
  id: ID, // base64-encoded public key
  avatar?: ?string,
  name?: ?string,
  bio?: ?string,
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

export type MessageBlock = MessageBlockFile | MessageBlockText

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
  // $FlowFixMe
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
  // $FlowFixMe
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
  topic: topic,
}

type Viewer = {
  channels: Array<ConversationData>,
  contacts: Array<ContactData>,
  profile: ?Profile,
}

type Timer = number
type ConvoTypings = Map<ID, Timer> // keyed by peer ID

type State = {
  address: string,
  contactRequests: { [ID]: ContactRequest },
  contacts: { [ID]: Contact },
  convos: { [ID]: Conversation },
  profile: ?Profile,
}

export default class DB {
  pubsub: PubSub = new PubSub()

  _store: Conf
  _typings: Map<ID, ConvoTypings> = new Map()

  constructor(store: ?Conf) {
    this._store = store || new Conf()
    if (!this._store.has('state')) {
      this.resetState()
    }
  }

  resetState() {
    this._store.set('state', {
      address: '',
      contactRequests: {},
      contacts: {},
      convos: {},
      profile: undefined,
    })
  }

  setupStore(address: string = '', id: string) {
    const storedId = this._store.get('state.profile.id')
    if (storedId != null && storedId !== id) {
      this.resetState()
    }
    this._store.set('state.profile.id', id)
    this._store.set('state.address', address)
  }

  setTypings(convoID: ID, convoTypings: ConvoTypings) {
    this._typings.set(convoID, convoTypings)
    const peers = Array.from(convoTypings.keys()).reduce((acc, id) => {
      const contact = this.getContact(id)
      if (contact) {
        acc.push(contact)
      }
      return acc
    }, [])
    this.pubsub.publish('typingsChanged', { id: convoID, peers })
    return peers
  }

  setTyping(convoID: ID, peerID: ID, typing: boolean) {
    let convoTypings = this._typings.get(convoID)
    if (convoTypings == null) {
      convoTypings = new Map()
      if (typing) {
        convoTypings.set(peerID, this.resetTyping(convoID, peerID))
        return this.setTypings(convoID, convoTypings)
      } // Otherwise nothing to do
    } else {
      // Discard existing timer if set
      const peerTimer = convoTypings.get(peerID)
      if (peerTimer != null) {
        clearTimeout(peerTimer)
        convoTypings.delete(peerID)
      }
      if (typing) {
        convoTypings.set(peerID, this.resetTyping(convoID, peerID))
      }
      return this.setTypings(convoID, convoTypings)
    }
  }

  resetTyping(convoID: ID, peerID: ID) {
    return setTimeout(this.setTyping, TYPING_TIMEOUT, convoID, peerID, false)
  }

  getAddress(): string {
    return this._store.get('state.address')
  }

  setProfile(profile: Profile) {
    this._store.set('state.profile', profile)
  }

  getProfile(): ?Profile {
    return this._store.get('state.profile')
  }

  deleteContactRequest(id: ID) {
    this._store.delete(`state.contactRequests.${id}`)
  }

  getContactRequest(id: ID) {
    return this._store.get(`state.contactRequests.${id}`)
  }

  setContactRequest(contact: Contact, request: ContactRequest) {
    log('set contact request', contact, request)
    this._store.set(`state.contacts.${contact.profile.id}`, contact)
    this._store.set(`state.contactRequests.${contact.profile.id}`, request)
    this.pubsub.publish('contactsChanged', this.getContacts())
    this.pubsub.publish('contactRequested', contact.profile)
  }

  getConversation(
    id: ID,
    withContacts: boolean = false,
  ): ?(Conversation | ConversationData) {
    const convo = this._store.get(`state.convos.${id}`)
    if (convo) {
      // $FlowFixMe
      return {
        ...convo,
        peers: withContacts
          ? convo.peers.map(id => this.getContact(id))
          : convo.peers,
      }
    }
  }

  getContact(id: ID, withConvo: boolean = false): ?(Contact | ContactData) {
    const contact = this._store.get(`state.contacts.${id}`)
    if (contact) {
      const convo =
        withConvo && contact.convoID != null
          ? this.getConversation(contact.convoID)
          : undefined
      // $FlowFixMe
      return { ...contact, convo }
    }
  }

  getContacts(withConvo: boolean = false) {
    const storedContacts = this._store.get('state.contacts')
    return Object.keys(storedContacts).map(id => this.getContact(id, withConvo))
  }

  getConversations(filterType?: ConvoType) {
    const storedConvos = this._store.get('state.convos')
    const convos = Object.keys(storedConvos).map(id =>
      this.getConversation(id, true),
    )
    return filterType ? convos.filter(c => c && c.type === filterType) : convos
  }

  getChannels() {
    return this.getConversations('CHANNEL')
  }

  // $FlowFixMe
  getViewer(): Viewer {
    return {
      channels: this.getChannels(),
      contacts: this.getContacts(true),
      profile: this.getProfile(),
    }
  }

  setContact(contact: Contact) {
    this._store.set(`state.contacts.${contact.profile.id}`, contact)
    log('set contact', contact)
    this.pubsub.publish(
      'contactChanged',
      this.getContact(contact.profile.id, true),
    )
    this.pubsub.publish('contactsChanged')
  }

  hasConversation(convoId: ID) {
    return this._store.has(`state.convos.${convoId}`)
  }

  setConversation(convo: Conversation) {
    this._store.set(`state.convos.${convo.id}`, convo)
    log('set convo', convo)
    this.pubsub.publish(
      convo.type === 'CHANNEL' ? 'channelsChanged' : 'contactsChanged',
    )
  }

  updateConversationPointer(id: ID): ?Conversation {
    const convo = this._store.get(`state.convos.${id}`)
    if (convo != null && convo.pointer != convo.messages.length) {
      convo.lastActiveTimestamp = Date.now()
      convo.pointer = convo.messages.length
      this.setConversation(convo)
    }
    return convo
  }

  upsertContact(contact: Contact) {
    const existing = this.getContact(contact.profile.id)
    this.setContact(existing ? merge({}, existing, contact) : contact)
  }

  addMessage(
    id: ID,
    msg: Message | SendMessage,
    fromSelf: boolean = false,
  ): ?Message {
    const convo = this.getConversation(id)
    if (convo == null) {
      log('invalid addMessage call: conversation not found', id)
      return
    }

    if (fromSelf) {
      const profile = this.getProfile()
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

    const messages = convo.messages || []
    // $FlowFixMe
    messages.push(msg)
    convo.messages = messages
    convo.messageCount = messages.length

    if (fromSelf) {
      convo.pointer = messages.length
    }

    this.setConversation(convo)
    this.pubsub.publish('messageAdded', { id, message: msg })
    // $FlowFixMe
    return msg
  }
}
