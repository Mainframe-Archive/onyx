'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _graphqlSubscriptions = require('graphql-subscriptions');

var _graphqlTools = require('graphql-tools');

var _graphqlTypeJson = require('graphql-type-json');

var _graphqlTypeJson2 = _interopRequireDefault(_graphqlTypeJson);

var _ip = require('ip');

var _ip2 = _interopRequireDefault(_ip);

var _v = require('uuid/v4');

var _v2 = _interopRequireDefault(_v);

var _db = require('../data/db');

var _pubsub = require('../data/pubsub');

var _pubsub2 = _interopRequireDefault(_pubsub);

var _client = require('../pss/client');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const log = (0, _debug2.default)('dcd:graphql:schema');

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

union MessageBlock = MessageBlockText | MessageBlockFile | MessageBlockAction

type MessageBlockText {
  text: String!
}

type MessageBlockFile {
  file: File!
}

type MessageBlockAction {
  action: Action!
}

type File {
  name: String!
  hash: String!
  mimeType: String
  size: Int
}

type Action {
  id: ID!
  assignee: ID!
  sender: ID!
  state: String!
  text: String!
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
  setActionDone(id: ID!): Conversation!
  setTyping(input: TypingInput!): Conversation!
  updatePointer(id: ID!): Conversation!
}

type Subscription {
  actionChanged(id: ID!): Action!
  channelsChanged: Viewer!
  contactChanged(id: ID!): Contact!
  contactRequested: Profile!
  contactsChanged: Viewer!
  messageAdded(id: ID!): MessageAddedPayload!
  typingsChanged(id: ID!): [Profile!]!
}
`;

exports.default = (pss, port) => {
  const serverURL = `http://${_ip2.default.address()}:${port}/graphql`;

  const resolvers = {
    JSON: _graphqlTypeJson2.default,
    MessageBlock: {
      __resolveType(obj) {
        if (obj.action) {
          return 'MessageBlockAction';
        }
        if (obj.file) {
          return 'MessageBlockFile';
        }
        if (obj.text) {
          return 'MessageBlockText';
        }
        return null;
      }
    },
    Query: {
      contact: (root, { id }) => (0, _db.getContact)(id, true),
      conversation: (root, { id }) => (0, _db.getConversation)(id, true),
      serverURL: () => serverURL,
      viewer: () => (0, _db.getViewer)()
    },
    Mutation: {
      acceptContact: async (root, { id }) => {
        log('acceptContact', id);
        const request = (0, _db.getContactRequest)(id);
        if (request != null) {
          await (0, _client.acceptContact)(pss, id, request);
        }
        // If the request doesn't exist, it's possible the contact is already accepted
        const contact = (0, _db.getContact)(id, true);
        if (contact != null) {
          return contact;
        }
        throw new Error('Contact request not found');
      },
      createChannel: async (root, { input }) => {
        log('create channel', input);
        const { topic } = await (0, _client.createChannel)(pss, input.subject, input.peers, input.dark);
        return (0, _db.getConversation)(topic.hex, true);
      },
      requestContact: async (root, { id }) => {
        log('requestContact', id);
        const { contact } = await (0, _client.requestContact)(pss, id);
        return contact;
      },
      sendMessage: async (root, { input }) => {
        const profile = (0, _db.getProfile)();
        if (profile == null) {
          throw new Error('Profile not set');
        }

        const convo = (0, _db.getConversation)(input.convoID);
        if (convo == null) {
          throw new Error('Invalid convoID');
        }
        if (input.blocks == null || input.blocks.length === 0) {
          throw new Error('Invalid block');
        }

        // TODO: better blocks validation (sent as JSON - need to check the types)
        const blocks = input.blocks.map(b => {
          if (b.action) {
            b.action.id = (0, _v2.default)();
            b.action.sender = profile.id;
            b.action.state = 'PENDING';
          }
          return b;
        });
        const msg = await (0, _client.sendMessage)(input.convoID, blocks);
        if (msg == null) {
          throw new Error('Error creating message');
        }
        return msg;
      },
      setActionDone: (root, { id }) => {
        const action = (0, _db.getAction)(id);
        if (action == null) {
          throw new Error('Action not found');
        }
        (0, _client.setActionDone)(action);
        return (0, _db.getConversation)(action.convoID);
      },
      setTyping: (root, { input }) => {
        (0, _client.setTyping)(input.convoID, input.typing);
        return (0, _db.getConversation)(input.convoID);
      },
      updatePointer: (root, { id }) => (0, _db.updateConversationPointer)(id)
    },
    Subscription: {
      channelsChanged: {
        subscribe: () => _pubsub2.default.asyncIterator('channelsChanged'),
        resolve: () => {
          log('trigger channelsChanged subscription');
          return (0, _db.getViewer)();
        }
      },
      contactChanged: {
        subscribe: (0, _graphqlSubscriptions.withFilter)(() => _pubsub2.default.asyncIterator('contactChanged'), (payload, variables) => payload.profile.id === variables.id),
        resolve: payload => {
          log('trigger contactChanged subscription', payload);
          return payload;
        }
      },
      contactRequested: {
        subscribe: () => _pubsub2.default.asyncIterator('contactRequested'),
        resolve: payload => {
          log('trigger contactRequested subscription', payload);
          return payload;
        }
      },
      contactsChanged: {
        subscribe: () => _pubsub2.default.asyncIterator('contactsChanged'),
        resolve: () => {
          log('trigger contactsChanged subscription');
          return (0, _db.getViewer)();
        }
      },
      messageAdded: {
        subscribe: (0, _graphqlSubscriptions.withFilter)(() => _pubsub2.default.asyncIterator('messageAdded'), (payload, variables) => payload.id === variables.id),
        resolve: payload => {
          log('trigger messageAdded subscription', payload.id, payload.message);
          return {
            conversation: (0, _db.updateConversationPointer)(payload.id),
            message: payload.message
          };
        }
      },
      typingsChanged: {
        subscribe: (0, _graphqlSubscriptions.withFilter)(() => _pubsub2.default.asyncIterator('typingsChanged'), (payload, variables) => payload.id === variables.id),
        resolve: payload => {
          const profiles = payload.peers.map(c => c.profile);
          log('trigger typingsChanged subscription', payload.id, profiles);
          return profiles;
        }
      }
    }
  };

  return (0, _graphqlTools.makeExecutableSchema)({ typeDefs, resolvers });
};