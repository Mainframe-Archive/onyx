// @flow

import { randomBytes } from 'crypto'
import { decodeHex, encodeHex, type hex } from 'erebos'
import { isObject, isString } from 'lodash'

import type { MessageBlock, Profile } from '../db'

const NONCE_SIZE = 8
const receivedNonces: Set<string> = new Set()

const createNonce = () => Buffer.from(randomBytes(NONCE_SIZE)).toString('hex')

export type ProtocolType =
  | 'CHANNEL_INVITE' // In p2p topic
  | 'CONTACT_REQUEST' // In contact topic
  | 'PROFILE_REQUEST' // In channel
  | 'PROFILE_RESPONSE' // In channel
  | 'TOPIC_JOINED' // In channel or p2p topic
  | 'TOPIC_MESSAGE' // In channel or p2p topic
  | 'TOPIC_TYPING' // In channel or p2p topic

export type PeerInfo = {
  address: hex,
  pubKey: hex,
}

export type ChannelInvitePayload = {
  topic: hex,
  subject: string,
  peers: Array<PeerInfo>,
  dark: boolean,
}

export type ContactRequestPayload = {
  address: hex,
  profile: Profile,
  topic: hex,
}

export type ProfileResponsePayload = {
  profile: Profile,
}

export type TopicJoinedPayload = {
  address: hex,
  profile?: ?Profile,
}

export type TopicMessagePayload = {
  blocks: Array<MessageBlock>,
}

export type TopicTypingPayload = {
  typing: boolean,
}

export type ProtocolPayload =
  | ChannelInvitePayload
  | ContactRequestPayload
  | ProfileResponsePayload
  | TopicJoinedPayload
  | TopicMessagePayload
  | TopicTypingPayload

export type ProtocolEvent<T = ProtocolType, P = ProtocolPayload> = {
  type: T,
  payload: P,
}

export type ReceivedEvent = ProtocolEvent<*, *> & {
  sender: hex,
}

export const decodeProtocol = (msg: string): ?ProtocolEvent<*, *> => {
  try {
    const envelope = JSON.parse(decodeHex(msg))
    if (
      isObject(envelope) &&
      envelope.nonce != null &&
      isObject(envelope.payload) &&
      isString(envelope.payload.type)
    ) {
      if (receivedNonces.has(envelope.nonce)) {
        console.warn('Duplicate message:', envelope)
      } else {
        receivedNonces.add(envelope.nonce)
        return envelope.payload
      }
    } else {
      console.warn('Unrecognised message format:', envelope)
    }
  } catch (err) {
    console.warn('Failed to decode protocol message:', msg, err)
  }
}

export const encodeProtocol = (data: ProtocolEvent<*, *>) =>
  encodeHex(
    JSON.stringify({
      nonce: createNonce(),
      payload: data,
    }),
  )

export type ChannelInviteEvent = ProtocolEvent<
  'CHANNEL_INVITE',
  ChannelInvitePayload,
>

export const channelInvite = (
  payload: ChannelInvitePayload,
): ChannelInviteEvent => ({
  type: 'CHANNEL_INVITE',
  payload,
})

export type ContactRequestEvent = ProtocolEvent<
  'CONTACT_REQUEST',
  ContactRequestPayload,
>

export const contactRequest = (
  payload: ContactRequestPayload,
): ContactRequestEvent => ({
  type: 'CONTACT_REQUEST',
  payload,
})

export type ProfileRequestEvent = ProtocolEvent<'PROFILE_REQUEST', {}>

export const profileRequest = (): ProfileRequestEvent => ({
  type: 'PROFILE_REQUEST',
  payload: {},
})

export type ProfileResponseEvent = ProtocolEvent<
  'PROFILE_RESPONSE',
  ProfileResponsePayload,
>

export const profileResponse = (profile: Profile): ProfileResponseEvent => ({
  type: 'PROFILE_RESPONSE',
  payload: { profile },
})

export type TopicJoinedEvent = ProtocolEvent<'TOPIC_JOINED', TopicJoinedPayload>

export const topicJoined = (
  profile: ?Profile,
  address?: hex = '',
): TopicJoinedEvent => ({
  type: 'TOPIC_JOINED',
  payload: { address, profile },
})

export type TopicMessageEvent = ProtocolEvent<
  'TOPIC_MESSAGE',
  TopicMessagePayload,
>

export const topicMessage = (
  payload: TopicMessagePayload,
): TopicMessageEvent => ({
  type: 'TOPIC_MESSAGE',
  payload,
})

export type TopicTypingEvent = ProtocolEvent<'TOPIC_TYPING', TopicTypingPayload>

export const topicTyping = (typing: boolean): TopicTypingEvent => ({
  type: 'TOPIC_TYPING',
  payload: { typing },
})
