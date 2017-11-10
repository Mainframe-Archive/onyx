'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addMessage = exports.upsertContact = exports.updateConversationPointer = exports.setConversation = exports.setContact = exports.getViewer = exports.getChannels = exports.getConversations = exports.getContacts = exports.getContact = exports.getConversation = exports.setContactRequest = exports.getContactRequest = exports.deleteContactRequest = exports.getProfile = exports.setProfile = exports.getAddress = exports.setAddress = exports.setTyping = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _lodash = require('lodash');

var _pubsub = require('./pubsub');

var _pubsub2 = _interopRequireDefault(_pubsub);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const TYPING_TIMEOUT = 10000; // 10 secs in ms

const log = (0, _debug2.default)('dcd:db'); // keyed by peer ID

const db = {
  address: '',
  contactRequests: new Map(),
  contacts: new Map(),
  convos: new Map(),
  profile: undefined,
  typings: new Map()
};

const resetTyping = (convoID, peerID) => setTimeout(setTyping, TYPING_TIMEOUT, convoID, peerID, false);

const setTypings = (convoID, typings) => {
  db.typings.set(convoID, typings);
  const peers = Array.from(typings.keys()).map(id => getContact(id));

  _pubsub2.default.publish('typingsChanged', { id: convoID, peers });
  return peers;
};

const setTyping = exports.setTyping = (convoID, peerID, typing) => {
  let convoTypings = db.typings.get(convoID);
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
  db.address = address;
};

const getAddress = exports.getAddress = () => db.address;

const setProfile = exports.setProfile = profile => {
  db.profile = profile;
};

const getProfile = exports.getProfile = () => db.profile;

const deleteContactRequest = exports.deleteContactRequest = id => db.contactRequests.delete(id);

const getContactRequest = exports.getContactRequest = id => db.contactRequests.get(id);

const setContactRequest = exports.setContactRequest = (contact, request) => {
  log('set contact request', contact, request);
  db.contacts.set(contact.profile.id, contact);
  db.contactRequests.set(contact.profile.id, request);
  _pubsub2.default.publish('contactsChanged', getContacts());
  _pubsub2.default.publish('contactRequested', contact.profile);
};

const getConversation = exports.getConversation = (id, withContacts = false) => {
  const convo = db.convos.get(id);
  if (convo) {
    // $FlowFixMe
    return _extends({}, convo, {
      peers: withContacts ? convo.peers.map(id => getContact(id)) : convo.peers
    });
  }
};

const getContact = exports.getContact = (id, withConvo = false) => {
  const contact = db.contacts.get(id);
  if (contact) {
    const convo = withConvo && contact.convoID != null ? getConversation(contact.convoID) : undefined;
    // $FlowFixMe
    return _extends({}, contact, { convo });
  }
};

const getContacts = exports.getContacts = (withConvo = false) => Array.from(db.contacts.keys()).map(id => getContact(id, withConvo));

const getConversations = exports.getConversations = filterType => {
  const convos = Array.from(db.convos.keys()).map(id => getConversation(id, true));
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
  db.contacts.set(contact.profile.id, contact);
  log('set contact', contact);
  _pubsub2.default.publish('contactChanged', getContact(contact.profile.id, true));
  _pubsub2.default.publish('contactsChanged');
};

const setConversation = exports.setConversation = convo => {
  db.convos.set(convo.id, convo);
  log('set convo', convo);
  _pubsub2.default.publish(convo.type === 'CHANNEL' ? 'channelsChanged' : 'contactsChanged');
};

const updateConversationPointer = exports.updateConversationPointer = id => {
  const convo = db.convos.get(id);
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
    if (db.profile == null || db.profile.id == null) {
      log('invalid addMessage call from self: profile ID is not defined');
      return;
    }
    msg.sender = db.profile.id;
  }

  if (msg.source == null) {
    msg.source = 'USER';
  }
  msg.timestamp = convo.lastActiveTimestamp = Date.now();

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

exports.default = db;