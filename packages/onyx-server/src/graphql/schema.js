// @flow

import debug from 'debug'
import type { PSS } from 'erebos'
import { withFilter } from 'graphql-subscriptions'
import { makeExecutableSchema } from 'graphql-tools'
import GraphQLJSON from 'graphql-type-json'
import ip from 'ip'
import uuid from 'uuid/v4'

import type DB from '../db'
import {
  acceptContact,
  createChannel,
  resendInvites,
  requestContact,
  sendMessage,
  setTyping,
} from '../pss/client'

const log = debug('onyx:graphql:schema')

const typeDefs = `
scalar JSON

type Profile {
  id: ID!
  avatar: String
  name: String
  bio: String
}

type Contact {
  profile: Profile!
  state: String
  convoID: ID
  convo: Conversation
}

type ContactRequest {
  profile: Profile!
}

type Conversation {
  id: ID!
  type: String!
  subject: String
  messages: [Message!]!
  messageCount: Int!
  peers: [Contact!]!
  pointer: Int
  lastActiveTimestamp: Float!
  dark: Boolean!
}

type Message {
  sender: ID!
  timestamp: Float!
  source: String!
  blocks: [MessageBlock!]!
}

union MessageBlock = MessageBlockText | MessageBlockFile

type MessageBlockText {
  text: String!
}

type MessageBlockFile {
  file: File!
}

type File {
  name: String!
  hash: String!
  mimeType: String
  size: Int
}

input ProfileInput {
  avatar: String
  name: String!
  bio: String
}

input ChannelInput {
  subject: String!
  peers: [ID!]!
  dark: Boolean!
}

input MessageInput {
  convoID: ID!
  blocks: [JSON!]!
}

input TypingInput {
  convoID: ID!
  typing: Boolean!
}

type MessageAddedPayload {
  conversation: Conversation!
  message: Message!
}

type Viewer {
  channels: [Conversation!]!
  contacts: [Contact!]!
  profile: Profile!
}

type Query {
  contact(id: ID!): Contact
  conversation(id: ID!): Conversation
  serverURL: String!
  viewer: Viewer!
}

type Mutation {
  acceptContact(id: ID!): Contact!
  createChannel(input: ChannelInput!): Conversation!
  requestContact(id: ID!): Contact!
  sendMessage(input: MessageInput!): Message!
  setTyping(input: TypingInput!): Conversation!
  updatePointer(id: ID!): Conversation!
  resendInvites(id: ID!): Conversation!
  updateProfile(input: ProfileInput!): Profile!
}

type Subscription {
  channelsChanged: Viewer!
  contactChanged(id: ID!): Contact!
  contactRequested: Profile!
  contactsChanged: Viewer!
  messageAdded(id: ID!): MessageAddedPayload!
  typingsChanged(id: ID!): [Profile!]!
}
`

export default (pss: PSS, db: DB, port: number) => {
  const serverURL = `http://${ip.address()}:${port}/graphql`

  const resolvers = {
    JSON: GraphQLJSON,
    MessageBlock: {
      __resolveType(obj) {
        if (obj.file) {
          return 'MessageBlockFile'
        }
        if (obj.text) {
          return 'MessageBlockText'
        }
        return null
      },
    },
    Query: {
      contact: (root, { id }) => db.getContact(id, true),
      conversation: (root, { id }) => db.getConversation(id, true),
      serverURL: () => serverURL,
      viewer: () => db.getViewer(),
    },
    Mutation: {
      acceptContact: async (root, { id }) => {
        log('acceptContact', id)
        const request = db.getContactRequest(id)
        if (request != null) {
          await acceptContact(pss, db, id, request)
        }
        // If the request doesn't exist, it's possible the contact is already accepted
        const contact = db.getContact(id, true)
        if (contact != null) {
          return contact
        }
        throw new Error('Contact request not found')
      },
      createChannel: async (root, { input }) => {
        log('create channel', input)
        const { topic } = await createChannel(
          pss,
          db,
          input.subject,
          input.peers,
          input.dark,
        )
        return db.getConversation(topic.hex, true)
      },
      requestContact: async (root, { id }) => {
        log('requestContact', id)
        const { contact } = await requestContact(pss, db, id)
        return contact
      },
      sendMessage: async (root, { input }) => {
        const profile = db.getProfile()
        if (profile == null) {
          throw new Error('Profile not set')
        }

        const convo = db.getConversation(input.convoID)
        if (convo == null) {
          throw new Error('Invalid convoID')
        }
        if (input.blocks == null || input.blocks.length === 0) {
          throw new Error('Invalid block')
        }
        const msg = await sendMessage(db, input.convoID, input.blocks)
        if (msg == null) {
          throw new Error('Error creating message')
        }
        return msg
      },
      setTyping: (root, { input }) => {
        setTyping(input.convoID, input.typing)
        return db.getConversation(input.convoID)
      },
      updatePointer: (root, { id }) => db.updateConversationPointer(id),
      updateProfile: (root, { input }) => {
        const profile = db.getProfile()
        const updatedProfile = Object.assign(profile, input)
        db.setProfile(updatedProfile)
        return updatedProfile
      },
      resendInvites: async (root, { id }) => {
        const convo = db.getConversation(id)
        if (convo == null) {
          throw new Error('Invalid convo id')
        }
        // $FlowFixMe
        resendInvites(db, convo.id, convo.dark, convo.subject, convo.peers)
        return convo
      },
    },
    Subscription: {
      channelsChanged: {
        subscribe: () => db.pubsub.asyncIterator('channelsChanged'),
        resolve: () => {
          log('trigger channelsChanged subscription')
          return db.getViewer()
        },
      },
      contactChanged: {
        subscribe: withFilter(
          () => db.pubsub.asyncIterator('contactChanged'),
          (payload, variables) => payload.profile.id === variables.id,
        ),
        resolve: payload => {
          log('trigger contactChanged subscription', payload)
          return payload
        },
      },
      contactRequested: {
        subscribe: () => db.pubsub.asyncIterator('contactRequested'),
        resolve: payload => {
          log('trigger contactRequested subscription', payload)
          return payload
        },
      },
      contactsChanged: {
        subscribe: () => db.pubsub.asyncIterator('contactsChanged'),
        resolve: () => {
          log('trigger contactsChanged subscription')
          return db.getViewer()
        },
      },
      messageAdded: {
        subscribe: withFilter(
          () => db.pubsub.asyncIterator('messageAdded'),
          (payload, variables) => payload.id === variables.id,
        ),
        resolve: payload => {
          log('trigger messageAdded subscription', payload.id, payload.message)
          return {
            conversation: db.updateConversationPointer(payload.id),
            message: payload.message,
          }
        },
      },
      typingsChanged: {
        subscribe: withFilter(
          () => db.pubsub.asyncIterator('typingsChanged'),
          (payload, variables) => payload.id === variables.id,
        ),
        resolve: payload => {
          const profiles = payload.peers.map(c => c.profile)
          log('trigger typingsChanged subscription', payload.id, profiles)
          return profiles
        },
      },
    },
  }

  return makeExecutableSchema({ typeDefs, resolvers })
}
