'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addMessage = exports.upsertContact = exports.updateConversationPointer = exports.setConversation = exports.hasConversation = exports.setContact = exports.getViewer = exports.getChannels = exports.getConversations = exports.getContacts = exports.getContact = exports.getConversation = exports.setAction = exports.getAction = exports.setContactRequest = exports.getContactRequest = exports.deleteContactRequest = exports.getProfile = exports.setProfile = exports.getAddress = exports.setAddress = exports.setTyping = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _electronStore = require('electron-store');

var _electronStore2 = _interopRequireDefault(_electronStore);

var _pubsub = require('./pubsub');

var _pubsub2 = _interopRequireDefault(_pubsub);

var _lodash = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const TYPING_TIMEOUT = 10000; // 10 secs in ms

const log = (0, _debug2.default)('dcd:db'); // keyed by peer ID

const store = new _electronStore2.default();

const resetState = () => {
  store.set('state', {
    actions: {},
    address: '',
    contactRequests: {},
    contacts: {},
    convos: {},
    // TODO: store profiles mock as [address]: PeerProfile
    // get own profile based on address
    profile: undefined
  });
};

log(store.get('state'));

if (!store.has('state')) {
  resetState();
}

const _typings = new Map();

const resetTyping = (convoID, peerID) => {
  return setTimeout(setTyping, TYPING_TIMEOUT, convoID, peerID, false);
};

const setTypings = (convoID, convoTypings) => {
  _typings.set(convoID, convoTypings);
  const peers = Array.from(convoTypings.keys()).reduce((acc, id) => {
    const contact = getContact(id);
    if (contact) {
      acc.push(contact);
    }
    return acc;
  }, []);
  _pubsub2.default.publish('typingsChanged', { id: convoID, peers });
  return peers;
};

const setTyping = exports.setTyping = (convoID, peerID, typing) => {
  let convoTypings = _typings.get(convoID);
  if (convoTypings == null) {
    convoTypings = new Map();
    if (typing) {
      convoTypings.set(peerID, resetTyping(convoID, peerID));
      return setTypings(convoID, convoTypings);
    } // Otherwise nothing to do
  } else {
    // Discard existing timer if set
    const peerTimer = convoTypings.get(peerID);
    if (peerTimer != null) {
      clearTimeout(peerTimer);
      convoTypings.delete(peerID);
    }
    if (typing) {
      convoTypings.set(peerID, resetTyping(convoID, peerID));
    }
    return setTypings(convoID, convoTypings);
  }
};

const setAddress = exports.setAddress = (address = '') => {
  store.set('state.address', address);
};

const getAddress = exports.getAddress = () => store.get('state.address');

const setProfile = exports.setProfile = profile => {
  store.set('state.profile', profile);
};

const updateStore = (key, value) => {
  // const store = store.get
};

const getProfile = exports.getProfile = () => store.get('state.profile');

const deleteContactRequest = exports.deleteContactRequest = id => {
  const requests = store.get('state.contactRequests');
  delete requests[id];
  store.set('state.contactRequests', requests);
};

const getContactRequest = exports.getContactRequest = id => {
  return store.get('state.contactRequests')[id];
};

const setContactRequest = exports.setContactRequest = (contact, request) => {
  log('set contact request', contact, request);
  store.set(`state.contacts.${contact.profile.id}`, contact);
  store.set(`state.contactRequests.${contact.profile.id}`, request);
  _pubsub2.default.publish('contactsChanged', getContacts());
  _pubsub2.default.publish('contactRequested', contact.profile);
};

const getAction = exports.getAction = id => store.get('state.actions')[id];

const setAction = exports.setAction = (convoID, data) => {
  const action = { convoID, data };
  store.set(`state.actions.${data.id}`, action);
  return action;
};

const getConversation = exports.getConversation = (id, withContacts = false) => {
  const convo = store.get('state.convos')[id];
  if (convo) {
    const messages = convo.messages && convo.messages.length ? convo.messages.map(msg => {
      msg.blocks = msg.blocks.map(b => {
        if (b.action != null && typeof b.action.id === 'string') {
          const action = store.get('state.actions')[b.action.id];
          if (action != null) {
            // $FlowIgnore
            b.action = action.data;
          }
        }
        return b;
      });
      return msg;
    }) : [];
    // $FlowFixMe
    return _extends({}, convo, {
      messages,
      peers: withContacts ? convo.peers.map(id => getContact(id)) : convo.peers
    });
  }
};

const getContact = exports.getContact = (id, withConvo = false) => {
  const contact = store.get('state.contacts')[id];
  if (contact) {
    const convo = withConvo && contact.convoID != null ? getConversation(contact.convoID) : undefined;
    // $FlowFixMe
    return _extends({}, contact, { convo });
  }
};

const getContacts = exports.getContacts = (withConvo = false) => {
  const storedContacts = store.get('state.contacts');
  return Array.from(Object.keys(storedContacts)).map(id => getContact(id, withConvo));
};

const getConversations = exports.getConversations = filterType => {
  const storedConvos = store.get('state.convos');
  const convos = Array.from(Object.keys(storedConvos)).map(id => getConversation(id, true));
  return filterType ? convos.filter(c => c && c.type === filterType) : convos;
};

const getChannels = exports.getChannels = () => getConversations('CHANNEL');

// $FlowFixMe
const getViewer = exports.getViewer = () => ({
  channels: getChannels(),
  contacts: getContacts(true),
  profile: getProfile()
});

const setContact = exports.setContact = contact => {
  store.set(`state.contacts.${contact.profile.id}`, contact);
  log('set contact', contact);
  _pubsub2.default.publish('contactChanged', getContact(contact.profile.id, true));
  _pubsub2.default.publish('contactsChanged');
};

const hasConversation = exports.hasConversation = convoId => {
  return store.has(`state.convos.${convoId}`);
};

const setConversation = exports.setConversation = convo => {
  store.set(`state.convos.${convo.id}`, convo);
  log('set convo', convo);
  _pubsub2.default.publish(convo.type === 'CHANNEL' ? 'channelsChanged' : 'contactsChanged');
};

const updateConversationPointer = exports.updateConversationPointer = id => {
  const convo = store.get('state.convos')[id];
  if (convo != null && convo.pointer != convo.messages.length) {
    convo.lastActiveTimestamp = Date.now();
    convo.pointer = convo.messages.length;
    setConversation(convo);
  }
  return convo;
};

const upsertContact = exports.upsertContact = contact => {
  const existing = getContact(contact.profile.id);
  setContact(existing ? (0, _lodash.merge)({}, existing, contact) : contact);
};

const addMessage = exports.addMessage = (id, msg, fromSelf = false) => {
  const convo = getConversation(id);
  if (convo == null) {
    log('invalid addMessage call: conversation not found', id);
    return;
  }

  if (fromSelf) {
    const profile = getProfile();
    if (profile == null || profile.id == null) {
      log('invalid addMessage call from self: profile ID is not defined');
      return;
    }
    msg.sender = profile.id;
  }

  if (msg.source == null) {
    msg.source = 'USER';
  }
  msg.timestamp = convo.lastActiveTimestamp = Date.now();

  // $FlowFixMe
  const actionBlock = msg.blocks.find(b => b.action != null);
  if (actionBlock != null) {
    // $FlowFixMe
    setAction(id, actionBlock.action);
  }

  const messages = convo.messages || [];
  // $FlowFixMe
  messages.push(msg);
  convo.messages = messages;
  convo.messageCount = messages.length;

  if (fromSelf) {
    convo.pointer = messages.length;
  }

  setConversation(convo);
  _pubsub2.default.publish('messageAdded', { id, message: msg });
  // $FlowFixMe
  return msg;
};