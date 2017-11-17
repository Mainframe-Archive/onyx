// @flow

import debug from 'debug'
import {
  base64ToArray,
  base64ToHex,
  createPSSWebSocket,
  encodeHex,
  hexToArray,
  type byteArray,
  type topic,
  type PSS,
} from 'erebos'
import { Subscriber } from 'rxjs/Subscriber'

import type DB, {
  Contact,
  ContactRequest,
  ConvoType,
  ID,
  MessageBlock,
  SendMessage,
} from '../db'

import {
  decodeProtocol,
  encodeProtocol,
  channelInvite,
  contactRequest,
  profileRequest,
  profileResponse,
  topicJoined,
  topicMessage,
  topicTyping,
  type ChannelInvitePayload,
  type ContactRequestPayload,
  type PeerInfo,
  type ReceivedEvent,
  type TopicJoinedPayload,
} from './protocol'
import createTopicSubject, { type TopicSubject } from './TopicSubject'

const logClient = debug('onyx:pss:client')
const topics: Map<ID, TopicSubject> = new Map()

export const setPeerPublicKey = (
  pss: PSS,
  id: ID,
  topic: topic,
  address: string = '',
) => pss.setPeerPublicKey(base64ToArray(id), topic, address)

export const setupPss = async (db: DB, url: string) => {
  logClient(`connecting to Swarm ${url}`)
  const pss = createPSSWebSocket(url)

  const [id, address] = await Promise.all([
    pss.getPublicKey(),
    pss.getBaseAddr(),
  ])
  logClient(`connected to Swarm with public key ${id}`)

  db.setupStore(address, id)

  return pss
}

export const subscribeToStoredConvos = async (pss: PSS, db: DB) => {
  const convos = db.getConversations()
  convos.forEach(async c => {
    switch (c.type) {
      case 'DIRECT': {
        const contact = c.peers[0]
        // $FlowFixMe
        const dmTopic = await joinDirectTopic(pss, db, hexToArray(c.id), {
          address: contact.address,
          pubKey: contact.profile.id,
        })
        createP2PTopicSubscription(pss, db, dmTopic)
        break
      }
      case 'CHANNEL': {
        const channel = {
          subject: c.subject,
          // $FlowFixMe
          topic: hexToArray(c.id),
        }
        const profile = db.getProfile()
        if (profile) {
          const peers = c.peers.reduce((acc, p) => {
            if (p.profile && p.profile.id !== profile.id) {
              acc.push({
                pubKey: p.profile.id,
                address: p.address,
              })
            }
            return acc
          }, [])
          // $FlowFixMe
          const chanTopic = await joinChannelTopic(pss, db, channel, peers)
          createChannelTopicSubscription(pss, db, chanTopic)
        }
        break
      }
    }
  })
}

export const createContactTopic = (
  pss: PSS,
  publicKey: string,
): Promise<topic> => pss.stringToTopic(`onyx:contact:${publicKey}`)

export const createRandomTopic = (pss: PSS): Promise<topic> =>
  pss.stringToTopic(
    Math.random()
      .toString(36)
      .substr(2),
  )

const addTopic = (
  db: DB,
  topic: TopicSubject,
  type: ConvoType,
  peers: Array<ID>,
  channel?: ChannelInvitePayload,
) => {
  topics.set(topic.hex, topic)
  if (!db.hasConversation(topic.hex)) {
    db.setConversation({
      dark: channel ? channel.dark : false,
      id: topic.hex,
      lastActiveTimestamp: Date.now(),
      messages: [],
      messageCount: 0,
      pointer: 0,
      peers,
      subject: channel ? channel.subject : undefined,
      type,
    })
  }
}

// Join new channel topic with peers identified by public key
export const joinChannelTopic = async (
  pss: PSS,
  db: DB,
  channel: ChannelInvitePayload,
  otherPeers: Array<PeerInfo>,
): Promise<TopicSubject> => {
  logClient('join channel topic', channel)

  const topic = await createTopicSubject(pss, channel.topic)
  const peers = await Promise.all(
    otherPeers.map(async p => {
      const contact = db.getContact(p.pubKey)
      if (contact == null) {
        db.setContact({
          address: p.address,
          profile: { id: p.pubKey },
        })
      }
      await setPeerPublicKey(pss, p.pubKey, channel.topic, p.address)
      logClient('add peer', channel.topic, p.pubKey)
      topic.addPeer(p.pubKey)
      return p.pubKey
    }),
  )

  addTopic(db, topic, 'CHANNEL', peers, channel)
  return topic
}

// Join existing direct (p2p) topic with peer
export const joinDirectTopic = async (
  pss: PSS,
  db: DB,
  topicID: topic,
  peer: PeerInfo,
): Promise<TopicSubject> => {
  const [topic] = await Promise.all([
    createTopicSubject(pss, topicID),
    setPeerPublicKey(pss, peer.pubKey, topicID, peer.address),
  ])
  topic.addPeer(peer.pubKey)
  addTopic(db, topic, 'DIRECT', [peer.pubKey])
  return topic
}

export const sendMessage = (
  db: DB,
  topicHex: ID,
  blocks: Array<MessageBlock>,
): ?SendMessage => {
  const topic = topics.get(topicHex)
  if (topic == null) {
    logClient('cannot sent message to missing topic:', topicHex)
    return
  }

  const message = {
    blocks,
    source: 'USER',
  }
  topic.next(topicMessage(message))
  db.addMessage(topicHex, message, true)

  return message
}

export const setTyping = (topicHex: ID, typing: boolean) => {
  const topic = topics.get(topicHex)
  if (topic == null) {
    logClient('cannot set typing to missing topic:', topicHex)
  } else {
    topic.next(topicTyping(typing))
  }
}

const handleTopicJoined = (
  pss: PSS,
  db: DB,
  topic: TopicSubject,
  payload: TopicJoinedPayload,
) => {
  if (payload.profile == null || !payload.profile.id) {
    return
  }
  const contact = db.getContact(payload.profile.id)
  if (
    contact != null &&
    (!contact.address || contact.address.length < payload.address.length)
  ) {
    // Update contact's public key with a more precise address if provided
    setPeerPublicKey(pss, contact.profile.id, topic._topic, payload.address)
  }
}

const handleTopicMessage = (
  db: DB,
  topic: TopicSubject,
  msg: ReceivedEvent,
) => {
  switch (msg.type) {
    case 'TOPIC_MESSAGE':
      logClient('received topic message', msg.sender, msg.payload)
      db.addMessage(topic.hex, { ...msg.payload, sender: msg.sender })
      break
    case 'TOPIC_TYPING':
      db.setTyping(topic.hex, msg.sender, msg.payload.typing)
      break
    default:
      logClient('unhandled message topic type', msg.type)
  }
}

const createChannelTopicSubscription = (
  pss: PSS,
  db: DB,
  topic: TopicSubject,
) => {
  const log = debug(`onyx:pss:client:topic:channel:${topic.hex}`)
  log('create subscription')
  return topic.subscribe((msg: ReceivedEvent) => {
    log('received message', msg)
    switch (msg.type) {
      case 'PROFILE_REQUEST': {
        const profile = db.getProfile()
        if (profile == null) {
          log('received profile request before profile is setup, ignoring')
        } else {
          topic.toPeer(msg.sender, profileResponse(profile))
        }
        break
      }
      case 'PROFILE_RESPONSE':
        db.upsertContact({ profile: msg.payload.profile })
        break
      case 'TOPIC_JOINED':
        handleTopicJoined(pss, db, topic, msg.payload)
        // Always update latest profile provided by the user
        db.upsertContact({ profile: msg.payload.profile })
        break
      case 'TOPIC_MESSAGE':
      case 'TOPIC_TYPING':
        handleTopicMessage(db, topic, msg)
        break
      default:
        log('unhandled message type', msg.type)
    }
  })
}

const createP2PTopicSubscription = (pss: PSS, db: DB, topic: TopicSubject) => {
  const log = debug(`onyx:pss:client:topic:p2p:${topic.hex}`)
  return topic.subscribe((msg: ReceivedEvent) => {
    log('received message', msg)
    switch (msg.type) {
      case 'CHANNEL_INVITE':
        joinChannel(pss, db, msg.payload)
        break
      case 'TOPIC_JOINED':
        handleTopicJoined(pss, db, topic, msg.payload)
        db.upsertContact({
          address: msg.payload.address,
          profile: msg.payload.profile,
          state: 'ACCEPTED',
        })
        break
      case 'TOPIC_MESSAGE':
      case 'TOPIC_TYPING':
        handleTopicMessage(db, topic, msg)
        break
      default:
        log('unhandled message type', msg.type)
    }
  })
}

export const acceptContact = async (
  pss: PSS,
  db: DB,
  id: ID,
  request: ContactRequest,
) => {
  const existing = db.getContact(id)
  if (existing == null) {
    throw new Error(`Contact not found: ${id}`)
  }

  const topic = await joinDirectTopic(pss, db, request.topic, {
    address: request.address,
    pubKey: id,
  })
  const topicSubscription = createP2PTopicSubscription(pss, db, topic)

  // Delete request and update contact data with the created convo
  db.deleteContactRequest(id)
  db.setContact({
    address: request.address,
    convoID: topic.hex,
    profile: existing.profile,
    state: 'ACCEPTED',
  })

  topic.next(topicJoined(db.getProfile(), db.getAddress()))

  return { topic, topicSubscription }
}

export const joinChannel = async (
  pss: PSS,
  db: DB,
  channel: ChannelInvitePayload,
) => {
  const profile = db.getProfile()
  if (profile == null) {
    throw new Error('Cannot join channel before profile is setup')
  }

  logClient('join channel', profile.id, channel)

  const otherPeers = channel.peers.filter(p => p.pubKey !== profile.id)
  const topic = await joinChannelTopic(pss, db, channel, otherPeers)
  const topicSubscription = createChannelTopicSubscription(pss, db, topic)

  topic.next(topicJoined(db.getProfile(), db.getAddress()))

  otherPeers.forEach(p => {
    const contact = db.getContact(p.pubKey)
    if (contact == null) {
      topic.toPeer(p.pubKey, profileRequest())
    }
  })

  return { topic, topicSubscription }
}

export const createChannel = async (
  pss: PSS,
  db: DB,
  subject: string,
  peers: Array<ID>,
  dark: boolean,
) => {
  const profile = db.getProfile()
  if (profile == null) {
    throw new Error('Cannot create channel before profile is setup')
  }
  // Create and join the topic for this channel
  const topicID = await createRandomTopic(pss)
  const peerContacts = peers.map(id => db.getContact(id)).filter(Boolean)
  const pssPeers = formatPSSPeers(peerContacts, dark)

  const channel = {
    dark,
    topic: topicID,
    subject,
    peers: [
      { pubKey: profile.id, address: dark ? '' : db.getAddress() },
      ...pssPeers,
    ],
  }

  const topic = await joinChannelTopic(pss, db, channel, pssPeers)
  const topicSubscription = createChannelTopicSubscription(pss, db, topic)

  // Invite peers to the newly created topic
  invitePeersToChannel(channel, peerContacts)

  topic.next(topicJoined(db.getProfile()))

  return {
    topic,
    topicSubscription,
  }
}

export const resendInvites = async (
  db: DB,
  channelId: string,
  dark: boolean,
  subject: string,
  channelPeers: Array<ID>,
) => {
  const profile = db.getProfile()
  if (profile == null) {
    throw new Error('Cannot create channel before profile is setup')
  }
  const peerContacts = channelPeers.map(id => db.getContact(id)).filter(Boolean)
  const channel = {
    // $FlowFixMe
    topic: hexToArray(channelId),
    peers: [
      { pubKey: profile.id, address: dark ? '' : db.getAddress() },
      ...formatPSSPeers(peerContacts, dark),
    ],
    dark,
    subject,
  }
  invitePeersToChannel(channel, peerContacts)
}

const formatPSSPeers = (
  contactPeers: Array<Contact>,
  dark: boolean,
): Array<*> => {
  return contactPeers.map(c => ({
    address: (!dark && c.address) || '',
    pubKey: c.profile.id,
  }))
}

const invitePeersToChannel = (
  channel: ChannelInvitePayload,
  contacts: Array<Contact>,
) => {
  contacts.forEach(c => {
    const peerTopic = c.convoID && topics.get(c.convoID)
    if (peerTopic) {
      peerTopic.next(channelInvite(channel))
    }
  })
}

export const addContactRequest = async (
  pss: PSS,
  db: DB,
  payload: ContactRequestPayload,
) => {
  const contact = {
    profile: payload.profile,
    state: 'RECEIVED',
  }
  db.setContactRequest(contact, {
    address: payload.address,
    topic: payload.topic,
  })
  return contact
}

export const requestContact = async (pss: PSS, db: DB, id: string) => {
  const profile = db.getProfile()
  if (profile == null) {
    throw new Error('Cannot call requestContact() before profile is setup')
  }

  // Get topic for contact + create random new p2p topic
  const [contactTopic, newTopic] = await Promise.all([
    // $FlowFixMe
    createContactTopic(pss, id),
    createRandomTopic(pss),
  ])
  const log = debug(`onyx:pss:client:topic:p2p:${encodeHex(contactTopic)}`)

  // Create p2p topic and setup keys
  const [topic] = await Promise.all([
    joinDirectTopic(pss, db, newTopic, { pubKey: id, address: '' }),
    setPeerPublicKey(pss, id, contactTopic),
  ])

  const topicSubscription = createP2PTopicSubscription(pss, db, topic)

  const existing = db.getContact(id)
  const contact = {
    convoID: topic.hex,
    profile: existing ? existing.profile : { id },
    state: 'SENT',
  }
  db.setContact(contact)

  const req = contactRequest({
    address: db.getAddress(),
    profile,
    topic: newTopic,
  })
  log('request contact', req)
  // Send message requesting contact
  await pss.sendAsym(base64ToHex(id), contactTopic, encodeProtocol(req))

  return {
    contact,
    topic,
    topicSubscription,
  }
}

// Setup own contact topic and start subscribing to it
export const setupContactTopic = async (pss: PSS, db: DB) => {
  const profile = db.getProfile()
  if (profile == null || profile.id == null) {
    throw new Error('Cannot setup contact topic: profile is not setup')
  }

  const topic: topic = await createContactTopic(pss, profile.id)
  const subscription = await pss.subscribeTopic(topic)
  const log = debug(`onyx:pss:client:topic:contact:${encodeHex(topic)}`)

  return pss.createSubscription(subscription).subscribe(evt => {
    log('received message', evt)
    const data = decodeProtocol(evt.Msg)
    if (data && data.type === 'CONTACT_REQUEST') {
      addContactRequest(pss, db, data.payload)
    }
  })
}
