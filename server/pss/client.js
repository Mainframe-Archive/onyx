// @flow

import crc32 from 'crc-32'
import debug from 'debug'
import {
  base64ToArray,
  base64ToHex,
  createPSSWebSocket,
  encodeHex,
  hexToArray,
} from 'erebos'
import { Subscriber } from 'rxjs/Subscriber'

import {
  addMessage,
  deleteContactRequest,
  getAddress,
  getContact,
  getProfile,
  getConversations,
  setContact,
  setContactRequest,
  setConversation,
  hasConversation,
  setupStore,
  setTyping as setTypingPeer,
  upsertContact,
  type ContactRequest,
  type ConvoType,
  type ID,
  type MessageBlock,
  type SendMessage,
} from '../data/db'
import pubsub from '../data/pubsub'

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
import type { ByteArray } from './types'

const logClient = debug('dcd:pss:client')
const topics: Map<ID, TopicSubject> = new Map()

export const setPeerPublicKey = (
  pss: PSS,
  id: ID,
  topic: ByteArray,
  address: string = '',
) => pss.setPeerPublicKey(base64ToArray(id), topic, address)

export const setupPss = async (url: string, serverURL: string) => {
  logClient(`connecting to Swarm ${url}`)
  const pss = createPSSWebSocket(url)

  const [id, address] = await Promise.all([
    pss.getPublicKey(),
    pss.getBaseAddr(),
  ])
  logClient(`connected to Swarm with public key ${id}`)

  setupStore(address, id)

  return pss
}

export const subscribeToStoredConvos = async (pss: PSS) => {
  const convos = getConversations()
  convos.forEach(async c => {
    switch (c.type) {
      case 'DIRECT':
        const contact = c.peers[0]
        const dmTopic = await joinDirectTopic(pss, hexToArray(c.id), {
          address: contact.address,
          pubKey: contact.profile.id,
        })
        createP2PTopicSubscription(pss, dmTopic)
        break
      case 'CHANNEL':
        const channel = {
          subject: c.subject,
          topic: hexToArray(c.id),
        }
        const peers = c.peers.reduce((acc, p) => {
          const profile = getProfile()
          if (p.profile.id !== profile.id) {
            acc.push({
              pubKey: p.profile.id,
              address: p.address,
            })
          }
          return acc
        }, [])
        const chanTopic = await joinChannelTopic(pss, channel, peers)
        createChannelTopicSubscription(pss, chanTopic)
        break
    }
  })
}

export const createContactTopic = (
  pss: PSS,
  publicKey: string,
): Promise<ByteArray> => pss.stringToTopic(`dcd:contact:${publicKey}`)

export const createRandomTopic = (pss: PSS): Promise<ByteArray> =>
  pss.stringToTopic(
    Math.random()
      .toString(36)
      .substr(2),
  )

const addTopic = (
  topic: TopicSubject,
  type: ConvoType,
  peers: Array<ID>,
  channel?: ChannelInvitePayload,
) => {
  topics.set(topic.hex, topic)
  if (!hasConversation(topic.hex)) {
    setConversation({
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
  channel: ChannelInvitePayload,
  otherPeers: Array<PeerInfo>,
): Promise<TopicSubject> => {
  logClient('join channel topic', channel)

  const topic = await createTopicSubject(pss, channel.topic)
  const peers = await Promise.all(
    otherPeers.map(async p => {
      const contact = getContact(p.pubKey)
      if (contact == null) {
        setContact({
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

  addTopic(topic, 'CHANNEL', peers, channel)
  return topic
}

// Join existing direct (p2p) topic with peer
export const joinDirectTopic = async (
  pss: PSS,
  topicID: ByteArray,
  peer: PeerInfo,
): Promise<TopicSubject> => {
  const [topic] = await Promise.all([
    createTopicSubject(pss, topicID),
    setPeerPublicKey(pss, peer.pubKey, topicID, peer.address),
  ])
  topic.addPeer(peer.pubKey)
  addTopic(topic, 'DIRECT', [peer.pubKey])
  return topic
}

export const sendMessage = (
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
  addMessage(topicHex, message, true)

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
  topic: TopicSubject,
  payload: TopicJoinedPayload,
) => {
  if (payload.profile == null || !payload.profile.id) {
    return
  }
  const contact = getContact(payload.profile.id)
  if (
    contact != null &&
    (!contact.address || contact.address.length < payload.address.length)
  ) {
    // Update contact's public key with a more precise address if provided
    setPeerPublicKey(pss, contact.profile.id, topic._topic, payload.address)
  }
}

const handleTopicMessage = (topic: TopicSubject, msg: ReceivedEvent) => {
  switch (msg.type) {
    case 'TOPIC_MESSAGE':
      logClient('received topic message', msg.sender, msg.payload)
      addMessage(topic.hex, { ...msg.payload, sender: msg.sender })
      break
    case 'TOPIC_TYPING':
      setTypingPeer(topic.hex, msg.sender, msg.payload.typing)
      break
    default:
      logClient('unhandled message topic type', msg.type)
  }
}

const createChannelTopicSubscription = (pss: PSS, topic: TopicSubject) => {
  const log = debug(`dcd:pss:client:topic:channel:${topic.hex}`)
  log('create subscription')
  return topic.subscribe((msg: ReceivedEvent) => {
    log('received message', msg)
    switch (msg.type) {
      case 'PROFILE_REQUEST': {
        const profile = getProfile()
        if (profile == null) {
          log('received profile request before profile is setup, ignoring')
        } else {
          topic.toPeer(msg.sender, profileResponse(profile))
        }
        break
      }
      case 'PROFILE_RESPONSE':
        upsertContact({ profile: msg.payload.profile })
        break
      case 'TOPIC_JOINED':
        handleTopicJoined(pss, topic, msg.payload)
        // Always update latest profile provided by the user
        upsertContact({ profile: msg.payload.profile })
        break
      case 'TOPIC_MESSAGE':
      case 'TOPIC_TYPING':
        handleTopicMessage(topic, msg)
        break
      default:
        log('unhandled message type', msg.type)
    }
  })
}

const createP2PTopicSubscription = (pss: PSS, topic: TopicSubject) => {
  const log = debug(`dcd:pss:client:topic:p2p:${topic.hex}`)
  return topic.subscribe((msg: ReceivedEvent) => {
    log('received message', msg)
    switch (msg.type) {
      case 'CHANNEL_INVITE':
        joinChannel(pss, msg.payload)
        break
      case 'TOPIC_JOINED':
        handleTopicJoined(pss, topic, msg.payload)
        upsertContact({
          address: msg.payload.address,
          profile: msg.payload.profile,
          state: 'ACCEPTED',
        })
        break
      case 'TOPIC_MESSAGE':
      case 'TOPIC_TYPING':
        handleTopicMessage(topic, msg)
        break
      default:
        log('unhandled message type', msg.type)
    }
  })
}

export const acceptContact = async (
  pss: PSS,
  id: ID,
  request: ContactRequest,
) => {
  const existing = getContact(id)
  if (existing == null) {
    throw new Error(`Contact not found: ${id}`)
  }

  const topic = await joinDirectTopic(pss, request.topic, {
    address: request.address,
    pubKey: id,
  })
  const topicSubscription = createP2PTopicSubscription(pss, topic)

  // Delete request and update contact data with the created convo
  deleteContactRequest(id)
  setContact({
    address: request.address,
    convoID: topic.hex,
    profile: existing.profile,
    state: 'ACCEPTED',
  })

  topic.next(topicJoined(getProfile(), getAddress()))

  return { topic, topicSubscription }
}

export const joinChannel = async (pss: PSS, channel: ChannelInvitePayload) => {
  const profile = getProfile()
  if (profile == null) {
    throw new Error('Cannot join channel before profile is setup')
  }

  logClient('join channel', profile.id, channel)

  const otherPeers = channel.peers.filter(p => p.pubKey !== profile.id)
  const topic = await joinChannelTopic(pss, channel, otherPeers)
  const topicSubscription = createChannelTopicSubscription(pss, topic)

  topic.next(topicJoined(getProfile(), getAddress()))

  otherPeers.forEach(p => {
    const contact = getContact(p.pubKey)
    if (contact == null) {
      topic.toPeer(p.pubKey, profileRequest())
    }
  })

  return { topic, topicSubscription }
}

export const createChannel = async (
  pss: PSS,
  subject: string,
  peers: Array<ID>,
  dark: boolean,
) => {
  const profile = getProfile()
  if (profile == null) {
    throw new Error('Cannot create channel before profile is setup')
  }

  const filteredPeers = peers.map(id => getContact(id)).filter(Boolean)
  const otherPeers = filteredPeers.map(c => ({
    address: (!dark && c.address) || '',
    pubKey: c.profile.id,
  }))

  // Create and join the topic for this channel
  const topicID = await createRandomTopic(pss)
  const channel = {
    dark,
    topic: topicID,
    subject,
    peers: [
      { pubKey: profile.id, address: dark ? '' : getAddress() },
      ...otherPeers,
    ],
  }

  const topic = await joinChannelTopic(pss, channel, otherPeers)
  const topicSubscription = createChannelTopicSubscription(pss, topic)

  // Invite peers to the newly created topic
  filteredPeers.forEach(c => {
    const peerTopic = c.convoID && topics.get(c.convoID)
    if (peerTopic) {
      peerTopic.next(channelInvite(channel))
    }
  })

  topic.next(topicJoined(getProfile()))

  return {
    topic,
    topicSubscription,
  }
}

export const resendInvites = async (
  pss: PSS,
  channelId: string,
  dark: boolean,
  subject: string,
  channelPeers: Array<ID>
) => {
  const filteredPeers = channelPeers.map(id => getContact(id)).filter(Boolean)
  const peers = filteredPeers.map(c => ({
    address: (!dark && c.address) || '',
    pubKey: c.profile.id,
  }))
  logClient('peers:', peers)
  const channel = {
    topic: hexToArray(channelId),
    peers,
    dark,
    subject,
  }
  filteredPeers.forEach(c => {
    const peerTopic = c.convoID && topics.get(c.convoID)
    if (peerTopic) {
      logClient('resending invite', peerTopic)
      peerTopic.next(channelInvite(channel))
    }
  })
}

export const addContactRequest = async (
  pss: PSS,
  payload: ContactRequestPayload,
) => {
  const contact = {
    profile: payload.profile,
    state: 'RECEIVED',
  }
  setContactRequest(contact, {
    address: payload.address,
    topic: payload.topic,
  })
  return contact
}

export const requestContact = async (pss: PSS, id: string) => {
  const profile = getProfile()
  if (profile == null) {
    throw new Error('Cannot call requestContact() before profile is setup')
  }

  // Get topic for contact + create random new p2p topic
  const [contactTopic, newTopic] = await Promise.all([
    createContactTopic(pss, id),
    createRandomTopic(pss),
  ])
  const log = debug(`dcd:pss:client:topic:p2p:${encodeHex(contactTopic)}`)

  // Create p2p topic and setup keys
  const [topic] = await Promise.all([
    joinDirectTopic(pss, newTopic, { pubKey: id, address: '' }),
    setPeerPublicKey(pss, id, contactTopic),
  ])

  const topicSubscription = createP2PTopicSubscription(pss, topic)

  const existing = getContact(id)
  const contact = {
    convoID: topic.hex,
    profile: existing ? existing.profile : { id },
    state: 'SENT',
  }
  setContact(contact)

  const req = contactRequest({
    address: getAddress(),
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
export const setupContactTopic = async (pss: PSS) => {
  const profile = getProfile()
  if (profile == null || profile.id == null) {
    throw new Error('Cannot setup contact topic: profile is not setup')
  }

  const topic = await createContactTopic(pss, profile.id)
  const subscription = await pss.subscribeTopic(topic)
  const log = debug(`dcd:pss:client:topic:contact:${encodeHex(topic)}`)

  return pss.createSubscription(subscription).subscribe(evt => {
    log('received message', evt)
    const data = decodeProtocol(evt.Msg)
    if (data && data.type === 'CONTACT_REQUEST') {
      addContactRequest(pss, data.payload)
    }
  })
}
