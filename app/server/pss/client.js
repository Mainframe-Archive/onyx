'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setupContactTopic = exports.requestContact = exports.addContactRequest = exports.createChannel = exports.joinChannel = exports.acceptContact = exports.setTyping = exports.setActionDone = exports.sendMessage = exports.joinDirectTopic = exports.joinChannelTopic = exports.createRandomTopic = exports.createContactTopic = exports.subscribeToStoredConvos = exports.setupPss = exports.setPeerPublicKey = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _crc = require('crc-32');

var _crc2 = _interopRequireDefault(_crc);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _erebos = require('erebos');

var _Subscriber = require('rxjs/Subscriber');

var _db = require('../data/db');

var _pubsub = require('../data/pubsub');

var _pubsub2 = _interopRequireDefault(_pubsub);

var _protocol = require('./protocol');

var _TopicSubject = require('./TopicSubject');

var _TopicSubject2 = _interopRequireDefault(_TopicSubject);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const logClient = (0, _debug2.default)('dcd:pss:client');
const topics = new Map();

const setPeerPublicKey = exports.setPeerPublicKey = (pss, id, topic, address = '') => pss.setPeerPublicKey((0, _erebos.base64ToArray)(id), topic, address);

const setupPss = exports.setupPss = async (url, serverURL) => {
  logClient(`connecting to Swarm ${url}`);
  const pss = (0, _erebos.createPSSWebSocket)(url);

  const [id, address] = await Promise.all([pss.getPublicKey(), pss.getBaseAddr()]);
  logClient(`connected to Swarm with public key ${id}`);

  (0, _db.setProfile)({ id });
  (0, _db.setAddress)(address);

  return pss;
};

const subscribeToStoredConvos = exports.subscribeToStoredConvos = async pss => {
  const convos = (0, _db.getConversations)();
  convos.forEach(async c => {
    switch (c.type) {
      case 'DIRECT':
        const contact = c.peers[0];
        const dmTopic = await joinDirectTopic(pss, (0, _erebos.hexToArray)(c.id), {
          address: contact.address,
          pubKey: contact.profile.id
        });
        createP2PTopicSubscription(pss, dmTopic);
        break;
      case 'CHANNEL':
        const channel = {
          subject: c.subject,
          topic: (0, _erebos.hexToArray)(c.id)
        };
        const peers = c.peers.reduce((acc, p) => {
          const profile = (0, _db.getProfile)();
          if (p.profile.id !== profile.id) {
            acc.push({
              pubKey: p.profile.id,
              address: p.address
            });
          }
          return acc;
        }, []);
        const chanTopic = await joinChannelTopic(pss, channel, peers);
        createChannelTopicSubscription(pss, chanTopic);
        break;
    }
  });
};

const createContactTopic = exports.createContactTopic = (pss, publicKey) => pss.stringToTopic(`dcd:contact:${publicKey}`);

const createRandomTopic = exports.createRandomTopic = pss => pss.stringToTopic(Math.random().toString(36).substr(2));

const addTopic = (topic, type, peers, channel) => {
  topics.set(topic.hex, topic);
  if (!(0, _db.hasConversation)(topic.hex)) {
    (0, _db.setConversation)({
      dark: channel ? channel.dark : false,
      id: topic.hex,
      lastActiveTimestamp: Date.now(),
      messages: [],
      messageCount: 0,
      pointer: 0,
      peers,
      subject: channel ? channel.subject : undefined,
      type
    });
  }
};

// Join new channel topic with peers identified by public key
const joinChannelTopic = exports.joinChannelTopic = async (pss, channel, otherPeers) => {
  logClient('join channel topic', channel);

  const topic = await (0, _TopicSubject2.default)(pss, channel.topic);
  const peers = await Promise.all(otherPeers.map(async p => {
    const contact = (0, _db.getContact)(p.pubKey);
    if (contact == null) {
      (0, _db.setContact)({
        address: p.address,
        profile: { id: p.pubKey }
      });
    }
    await setPeerPublicKey(pss, p.pubKey, channel.topic, p.address);
    logClient('add peer', channel.topic, p.pubKey);
    topic.addPeer(p.pubKey);
    return p.pubKey;
  }));

  addTopic(topic, 'CHANNEL', peers, channel);
  return topic;
};

// Join existing direct (p2p) topic with peer
const joinDirectTopic = exports.joinDirectTopic = async (pss, topicID, peer) => {
  const [topic] = await Promise.all([(0, _TopicSubject2.default)(pss, topicID), setPeerPublicKey(pss, peer.pubKey, topicID, peer.address)]);
  topic.addPeer(peer.pubKey);
  addTopic(topic, 'DIRECT', [peer.pubKey]);
  return topic;
};

const sendMessage = exports.sendMessage = (topicHex, blocks) => {
  const topic = topics.get(topicHex);
  if (topic == null) {
    logClient('cannot sent message to missing topic:', topicHex);
    return;
  }

  const message = {
    blocks,
    source: 'USER'
  };
  topic.next((0, _protocol.topicMessage)(message));
  (0, _db.addMessage)(topicHex, message, true);

  return message;
};

const setActionDone = exports.setActionDone = action => {
  const topic = topics.get(action.convoID);
  if (topic == null) {
    logClient('cannot set action to missing topic:', action.convoID);
  } else {
    action.data.state = 'DONE';
    (0, _db.setAction)(action.convoID, action.data);
    (0, _db.addMessage)(action.convoID, {
      blocks: [{ action: action.data }],
      source: 'SYSTEM'
    }, true);
    topic.next((0, _protocol.actionState)(action.data.id, 'DONE'));
  }
};

const setTyping = exports.setTyping = (topicHex, typing) => {
  const topic = topics.get(topicHex);
  if (topic == null) {
    logClient('cannot set typing to missing topic:', topicHex);
  } else {
    topic.next((0, _protocol.topicTyping)(typing));
  }
};

const handleTopicJoined = (pss, topic, payload) => {
  if (payload.profile == null || !payload.profile.id) {
    return;
  }
  const contact = (0, _db.getContact)(payload.profile.id);
  if (contact != null && (!contact.address || contact.address.length < payload.address.length)) {
    // Update contact's public key with a more precise address if provided
    setPeerPublicKey(pss, contact.profile.id, topic._topic, payload.address);
  }
};

const handleTopicMessage = (topic, msg) => {
  switch (msg.type) {
    case 'ACTION_STATE':
      {
        const action = (0, _db.getAction)(msg.payload.id);
        if (action != null) {
          action.data.state = msg.payload.state;
          (0, _db.setAction)(action.convoID, action.data);
          (0, _db.addMessage)(action.convoID, {
            blocks: [{ action: action.data }],
            sender: msg.sender,
            source: 'SYSTEM'
          });
        }
        break;
      }
    case 'TOPIC_MESSAGE':
      logClient('received topic message', msg.sender, msg.payload);
      (0, _db.addMessage)(topic.hex, _extends({}, msg.payload, { sender: msg.sender }));
      break;
    case 'TOPIC_TYPING':
      (0, _db.setTyping)(topic.hex, msg.sender, msg.payload.typing);
      break;
    default:
      logClient('unhandled message topic type', msg.type);
  }
};

const createChannelTopicSubscription = (pss, topic) => {
  const log = (0, _debug2.default)(`dcd:pss:client:topic:channel:${topic.hex}`);
  log('create subscription');
  return topic.subscribe(msg => {
    log('received message', msg);
    switch (msg.type) {
      case 'PROFILE_REQUEST':
        {
          const profile = (0, _db.getProfile)();
          if (profile == null) {
            log('received profile request before profile is setup, ignoring');
          } else {
            topic.toPeer(msg.sender, (0, _protocol.profileResponse)(profile));
          }
          break;
        }
      case 'PROFILE_RESPONSE':
        (0, _db.upsertContact)({ profile: msg.payload.profile });
        break;
      case 'TOPIC_JOINED':
        handleTopicJoined(pss, topic, msg.payload);
        // Always update latest profile provided by the user
        (0, _db.upsertContact)({ profile: msg.payload.profile });
        break;
      case 'ACTION_STATE':
      case 'TOPIC_MESSAGE':
      case 'TOPIC_TYPING':
        handleTopicMessage(topic, msg);
        break;
      default:
        log('unhandled message type', msg.type);
    }
  });
};

const createP2PTopicSubscription = (pss, topic) => {
  const log = (0, _debug2.default)(`dcd:pss:client:topic:p2p:${topic.hex}`);
  return topic.subscribe(msg => {
    log('received message', msg);
    switch (msg.type) {
      case 'CHANNEL_INVITE':
        joinChannel(pss, msg.payload);
        break;
      case 'TOPIC_JOINED':
        handleTopicJoined(pss, topic, msg.payload);
        (0, _db.upsertContact)({
          address: msg.payload.address,
          profile: msg.payload.profile,
          state: 'ACCEPTED'
        });
        break;
      case 'ACTION_STATE':
      case 'TOPIC_MESSAGE':
      case 'TOPIC_TYPING':
        handleTopicMessage(topic, msg);
        break;
      default:
        log('unhandled message type', msg.type);
    }
  });
};

const acceptContact = exports.acceptContact = async (pss, id, request) => {
  const existing = (0, _db.getContact)(id);
  if (existing == null) {
    throw new Error(`Contact not found: ${id}`);
  }

  const topic = await joinDirectTopic(pss, request.topic, {
    address: request.address,
    pubKey: id
  });
  const topicSubscription = createP2PTopicSubscription(pss, topic);

  // Delete request and update contact data with the created convo
  (0, _db.deleteContactRequest)(id);
  (0, _db.setContact)({
    address: request.address,
    convoID: topic.hex,
    profile: existing.profile,
    state: 'ACCEPTED'
  });

  topic.next((0, _protocol.topicJoined)((0, _db.getProfile)(), (0, _db.getAddress)()));

  return { topic, topicSubscription };
};

const joinChannel = exports.joinChannel = async (pss, channel) => {
  const profile = (0, _db.getProfile)();
  if (profile == null) {
    throw new Error('Cannot join channel before profile is setup');
  }

  logClient('join channel', profile.id, channel);

  const otherPeers = channel.peers.filter(p => p.pubKey !== profile.id);
  const topic = await joinChannelTopic(pss, channel, otherPeers);
  const topicSubscription = createChannelTopicSubscription(pss, topic);

  topic.next((0, _protocol.topicJoined)((0, _db.getProfile)(), (0, _db.getAddress)()));

  otherPeers.forEach(p => {
    const contact = (0, _db.getContact)(p.pubKey);
    if (contact == null) {
      topic.toPeer(p.pubKey, (0, _protocol.profileRequest)());
    }
  });

  return { topic, topicSubscription };
};

const createChannel = exports.createChannel = async (pss, subject, peers, dark) => {
  const profile = (0, _db.getProfile)();
  if (profile == null) {
    throw new Error('Cannot create channel before profile is setup');
  }

  const filteredPeers = peers.map(id => (0, _db.getContact)(id)).filter(Boolean);
  const otherPeers = filteredPeers.map(c => ({
    address: !dark && c.address || '',
    pubKey: c.profile.id
  }));

  // Create and join the topic for this channel
  const topicID = await createRandomTopic(pss);
  const channel = {
    dark,
    topic: topicID,
    subject,
    peers: [{ pubKey: profile.id, address: dark ? '' : (0, _db.getAddress)() }, ...otherPeers]
  };

  const topic = await joinChannelTopic(pss, channel, otherPeers);
  const topicSubscription = createChannelTopicSubscription(pss, topic);

  // Invite peers to the newly created topic
  filteredPeers.forEach(c => {
    const peerTopic = c.convoID && topics.get(c.convoID);
    if (peerTopic) {
      peerTopic.next((0, _protocol.channelInvite)(channel));
    }
  });

  topic.next((0, _protocol.topicJoined)((0, _db.getProfile)()));

  return {
    topic,
    topicSubscription
  };
};

const addContactRequest = exports.addContactRequest = async (pss, payload) => {
  const contact = {
    profile: payload.profile,
    state: 'RECEIVED'
  };
  (0, _db.setContactRequest)(contact, {
    address: payload.address,
    topic: payload.topic
  });
  return contact;
};

const requestContact = exports.requestContact = async (pss, id) => {
  const profile = (0, _db.getProfile)();
  if (profile == null) {
    throw new Error('Cannot call requestContact() before profile is setup');
  }

  // Get topic for contact + create random new p2p topic
  const [contactTopic, newTopic] = await Promise.all([createContactTopic(pss, id), createRandomTopic(pss)]);
  const log = (0, _debug2.default)(`dcd:pss:client:topic:p2p:${(0, _erebos.encodeHex)(contactTopic)}`);

  // Create p2p topic and setup keys
  const [topic] = await Promise.all([joinDirectTopic(pss, newTopic, { pubKey: id, address: '' }), setPeerPublicKey(pss, id, contactTopic)]);

  const topicSubscription = createP2PTopicSubscription(pss, topic);

  const existing = (0, _db.getContact)(id);
  const contact = {
    convoID: topic.hex,
    profile: existing ? existing.profile : { id },
    state: 'SENT'
  };
  (0, _db.setContact)(contact);

  const req = (0, _protocol.contactRequest)({
    address: (0, _db.getAddress)(),
    profile,
    topic: newTopic
  });
  log('request contact', req);
  // Send message requesting contact
  await pss.sendAsym((0, _erebos.base64ToHex)(id), contactTopic, (0, _protocol.encodeProtocol)(req));

  return {
    contact,
    topic,
    topicSubscription
  };
};

// Setup own contact topic and start subscribing to it
const setupContactTopic = exports.setupContactTopic = async pss => {
  const profile = (0, _db.getProfile)();
  if (profile == null || profile.id == null) {
    throw new Error('Cannot setup contact topic: profile is not setup');
  }

  const topic = await createContactTopic(pss, profile.id);
  const subscription = await pss.subscribeTopic(topic);
  const log = (0, _debug2.default)(`dcd:pss:client:topic:contact:${(0, _erebos.encodeHex)(topic)}`);

  return pss.createSubscription(subscription).subscribe(evt => {
    log('received message', evt);
    const data = (0, _protocol.decodeProtocol)(evt.Msg);
    if (data && data.type === 'CONTACT_REQUEST') {
      addContactRequest(pss, data.payload);
    }
  });
};