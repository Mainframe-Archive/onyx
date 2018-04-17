// @flow

import debug from 'debug'
import { encodeHex, type hex, PssAPI, webSocketRPC } from 'erebos'
import { Subscriber } from 'rxjs/Subscriber'
import type { Subscription } from 'rxjs/Subscription'

import { pubKeyToAddress } from '../crypto'
import type DB, {
  Contact,
  ContactRequest,
  ConvoType,
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
const topics: Map<hex, TopicSubject> = new Map()

export const setupPss = async (db: DB, url: string) => {
  logClient(`connecting to Swarm ${url}`)
  const pss = new PssAPI(webSocketRPC(url))

  const [id, address] = await Promise.all([pss.getPublicKey(), pss.baseAddr()])
  logClient(`connected to Swarm with public key ${id}`)

  db.setupStore(address, id)

  return pss
}

export const subscribeToStoredConvos = async (pss: PssAPI, db: DB) => {
  const convos = db.getConversations()
  convos.forEach(async c => {
    switch (c.type) {
      case 'DIRECT': {
        const contact = c.peers[0]
        const dmTopic = await joinDirectTopic(pss, db, c.id, {
          address: contact.address || '0x',
          pubKey: contact.profile.id,
        })
        createP2PTopicSubscription(pss, db, dmTopic)
        break
      }
      case 'CHANNEL': {
        const channel = {
          subject: c.subject || '',
          topic: c.id,
          peers: [],
          dark: c.dark,
        }
        const profile = db.getProfile()
        if (profile) {
          const peers = c.peers.reduce((acc, p) => {
            if (p.profile && p.profile.id !== profile.id) {
              const address = p.address || '0x'
              acc.push({
                pubKey: p.profile.id,
                address: channel.dark ? '0x' : address,
              })
            }
            return acc
          }, [])
          channel.peers = [
            ...peers,
            {
              pubKey: profile.id,
              address: db.getAddress(),
            },
          ]
          const chanTopic = await joinChannelTopic(pss, db, channel, peers)
          createChannelTopicSubscription(pss, db, chanTopic)
        }
        break
      }
    }
  })
}

export const createContactTopic = (pss: PssAPI, publicKey: hex): Promise<hex> =>
  pss.stringToTopic(`onyx:contact:${publicKey}`)

export const createRandomTopic = (pss: PssAPI): Promise<hex> =>
  pss.stringToTopic(
    Math.random()
      .toString(36)
      .substr(2),
  )

const addTopic = (
  db: DB,
  topic: TopicSubject,
  type: ConvoType,
  peers: Array<hex>,
  channel?: ChannelInvitePayload,
) => {
  topics.set(topic.id, topic)
  if (!db.hasConversation(topic.id)) {
    db.setConversation({
      dark: channel ? channel.dark : false,
      id: topic.id,
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
  pss: PssAPI,
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
          address: p.address || '0x',
          profile: { id: p.pubKey, hasStake: true },
        })
      }
      try {
        await pss.setPeerPublicKey(p.pubKey, channel.topic, p.address)
        logClient('add peer', channel.topic, p.pubKey)
        topic.addPeer(p.pubKey)
        if (contact != null && !contact.profile.hasStake) {
          db.setContactStake(p.pubKey, true)
        }
      } catch (err) {
        if (err.message.includes('No stake found')) {
          db.setContactStake(p.pubKey, false)
        } else {
          throw err
        }
      }
      return p.pubKey
    }),
  )

  addTopic(db, topic, 'CHANNEL', peers, channel)
  return topic
}

// Join existing direct (p2p) topic with peer
export const joinDirectTopic = async (
  pss: PssAPI,
  db: DB,
  id: hex,
  peer: PeerInfo,
): Promise<TopicSubject> => {
  const contact = db.getContact(peer.pubKey)
  try {
    const [topic] = await Promise.all([
      createTopicSubject(pss, id),
      pss.setPeerPublicKey(peer.pubKey, id, peer.address),
    ])
    topic.addPeer(peer.pubKey)
    addTopic(db, topic, 'DIRECT', [peer.pubKey])
    if (contact != null && !contact.profile.hasStake) {
      // If able to join stake state must have changed
      db.setContactStake(contact.profile.id, true)
    }
    return topic
  } catch (err) {
    if (err.message.includes('No stake found') && contact) {
      db.setContactStake(contact.profile.id, false)
    }
    throw err
  }
}

export const sendMessage = (
  db: DB,
  topicHex: hex,
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

export const setTyping = (topicHex: hex, typing: boolean) => {
  const topic = topics.get(topicHex)
  if (topic == null) {
    logClient('cannot set typing to missing topic:', topicHex)
  } else {
    topic.next(topicTyping(typing))
  }
}

const handleTopicJoined = (
  pss: PssAPI,
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
    pss.setPeerPublicKey(contact.profile.id, topic.id, payload.address)
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
      db.addMessage(topic.id, { ...msg.payload, sender: msg.sender })
      break
    case 'TOPIC_TYPING':
      db.setTyping(topic.id, msg.sender, msg.payload.typing)
      break
    default:
      logClient('unhandled message topic type', msg.type)
  }
}

const createChannelTopicSubscription = (
  pss: PssAPI,
  db: DB,
  topic: TopicSubject,
): Subscription => {
  const log = debug(`onyx:pss:client:topic:channel:${topic.id}`)
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

const createP2PTopicSubscription = (
  pss: PssAPI,
  db: DB,
  topic: TopicSubject,
) => {
  const log = debug(`onyx:pss:client:topic:p2p:${topic.id}`)
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
  pss: PssAPI,
  db: DB,
  id: hex,
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
    convoID: topic.id,
    profile: existing.profile,
    state: 'ACCEPTED',
  })

  topic.next(topicJoined(db.getProfile(), db.getAddress()))

  return { topic, topicSubscription }
}

export const joinChannel = async (
  pss: PssAPI,
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
  pss: PssAPI,
  db: DB,
  subject: string,
  peers: Array<hex>,
  dark: boolean,
): Promise<{|
  +topic: TopicSubject,
  +topicSubscription: Subscription,
|}> => {
  const profile = db.getProfile()
  if (profile == null) {
    throw new Error('Cannot create channel before profile is setup')
  }
  // Create and join the topic for this channel
  const topichex = await createRandomTopic(pss)
  const peerContacts = peers.map(id => db.getContact(id)).filter(Boolean)
  const pssPeers = formatPSSPeers(peerContacts, dark)

  const channel = {
    dark,
    topic: topichex,
    subject,
    peers: [
      { pubKey: profile.id, address: dark ? '0x' : db.getAddress() },
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
  topic: hex,
  dark: boolean,
  subject: string,
  channelPeers: Array<hex>,
) => {
  const profile = db.getProfile()
  if (profile == null) {
    throw new Error('Cannot create channel before profile is setup')
  }
  const peerContacts = channelPeers.map(id => db.getContact(id)).filter(Boolean)
  const channel = {
    topic,
    peers: [
      { pubKey: profile.id, address: dark ? '0x' : db.getAddress() },
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
    address: (!dark && c.address) || '0x',
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
  pss: PssAPI,
  db: DB,
  payload: ContactRequestPayload,
) => {
  const addrHasStake = await db.contracts.walletHasStake(
    pubKeyToAddress(payload.profile.id),
  )
  const contact = {
    profile: {
      ...payload.profile,
      hasStake: addrHasStake,
    },
    state: 'RECEIVED',
  }
  db.setContactRequest(contact, {
    address: payload.address,
    topic: payload.topic,
  })
  return contact
}

export const requestContact = async (pss: PssAPI, db: DB, id: hex) => {
  const profile = db.getProfile()
  if (profile == null) {
    throw new Error('Cannot call requestContact() before profile is setup')
  }

  // Get topic for contact + create random new p2p topic
  const [contactTopic, newTopic] = await Promise.all([
    createContactTopic(pss, id),
    createRandomTopic(pss),
  ])
  const log = debug(`onyx:pss:client:topic:p2p:${contactTopic}`)

  // Create p2p topic and setup keys
  const [topic] = await Promise.all([
    joinDirectTopic(pss, db, newTopic, { pubKey: id, address: '0x' }),
    pss.setPeerPublicKey(id, contactTopic, '0x'),
  ])

  const topicSubscription = createP2PTopicSubscription(pss, db, topic)

  const existing = db.getContact(id)
  const contact = {
    convoID: topic.id,
    profile: existing ? existing.profile : { id, hasStake: true },
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
  await pss.sendAsym(id, contactTopic, encodeProtocol(req))

  return {
    contact,
    topic,
    topicSubscription,
  }
}

// Setup own contact topic and start subscribing to it
export const setupContactTopic = async (pss: PssAPI, db: DB) => {
  const profile = db.getProfile()
  if (profile == null || profile.id == null) {
    throw new Error('Cannot setup contact topic: profile is not setup')
  }

  const topic = await createContactTopic(pss, profile.id)
  const subscription = await pss.subscribeTopic(topic)
  const log = debug(`onyx:pss:client:topic:contact:${topic}`)

  return pss.createSubscription(subscription).subscribe(evt => {
    log('received message', evt)
    const data = decodeProtocol(evt.Msg)
    if (data && data.type === 'CONTACT_REQUEST') {
      addContactRequest(pss, db, data.payload)
    }
  })
}
