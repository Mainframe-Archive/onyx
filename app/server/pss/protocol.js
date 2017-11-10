'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.topicTyping = exports.topicMessage = exports.topicJoined = exports.profileResponse = exports.profileRequest = exports.contactRequest = exports.channelInvite = exports.actionState = exports.encodeProtocol = exports.decodeProtocol = undefined;

var _lodash = require('lodash');

var _lib = require('../lib');

const NONCE_SIZE = 8;
const receivedNonces = new Set(); // In channel or p2p topic

const decodeProtocol = exports.decodeProtocol = msg => {
  try {
    const envelope = JSON.parse(msg);
    if ((0, _lodash.isObject)(envelope) && envelope.nonce != null && (0, _lodash.isObject)(envelope.payload) && (0, _lodash.isString)(envelope.payload.type)) {
      if (receivedNonces.has(envelope.nonce)) {
        console.warn('Duplicate message:', envelope);
      } else {
        receivedNonces.add(envelope.nonce);
        return envelope.payload;
      }
    } else {
      console.warn('Unrecognised message format:', envelope);
    }
  } catch (err) {
    console.warn('Failed to decode protocol message:', msg, err);
  }
};

const encodeProtocol = exports.encodeProtocol = data => {
  const envelope = {
    nonce: (0, _lib.createKey)(NONCE_SIZE, true),
    payload: data
  };
  return (0, _lib.encodeMessage)(JSON.stringify(envelope));
};

const actionState = exports.actionState = (id, state) => ({
  type: 'ACTION_STATE',
  payload: { id, state }
});

const channelInvite = exports.channelInvite = payload => ({
  type: 'CHANNEL_INVITE',
  payload
});

const contactRequest = exports.contactRequest = payload => ({
  type: 'CONTACT_REQUEST',
  payload
});

const profileRequest = exports.profileRequest = () => ({
  type: 'PROFILE_REQUEST',
  payload: {}
});

const profileResponse = exports.profileResponse = profile => ({
  type: 'PROFILE_RESPONSE',
  payload: { profile }
});

const topicJoined = exports.topicJoined = (profile, address = '') => ({
  type: 'TOPIC_JOINED',
  payload: { address, profile }
});

const topicMessage = exports.topicMessage = payload => ({
  type: 'TOPIC_MESSAGE',
  payload
});

const topicTyping = exports.topicTyping = typing => ({
  type: 'TOPIC_TYPING',
  payload: { typing }
});