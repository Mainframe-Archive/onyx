// @flow

import debug from 'debug'
import { Observable } from 'rxjs'
import { AnonymousSubject } from 'rxjs/Subject'
import { Subscriber } from 'rxjs/Subscriber'

import { base64ToHex, hexToBase64, encodeHex, type Pss } from '../lib'

import { decodeProtocol, encodeProtocol, type ProtocolEvent } from './protocol'
import type { ByteArray, PublicKey } from './types'

export class TopicSubject extends AnonymousSubject<Object> {
  hex: string

  _log: (...args: *) => void
  _peers: Set<PublicKey>
  _pss: Pss
  _topic: ByteArray

  constructor(pss: Pss, topic: ByteArray, subscription: string) {
    const topicHex = encodeHex(topic)
    const log = debug(`dcd:pss:topic:${topicHex}`)
    const peers = new Set()

    const observer = new Subscriber((data: Object) => {
      log('send to all', data)
      const msg = encodeProtocol(data)
      peers.forEach(key => {
        pss.sendAsym(base64ToHex(key), topic, msg)
      })
    })

    const observable = pss
      .createSubscription(subscription)
      // $FlowIgnore
      .map(msg => {
        const sender = hexToBase64(msg.keyID)
        const data = decodeProtocol(msg.data)
        if (sender && data) {
          return { sender, ...data }
        } else {
          log('invalid message from subscription', msg)
        }
      })
      .filter(Boolean)

    super(observer, observable)
    this.hex = topicHex
    this._log = log
    this._peers = peers
    this._pss = pss
    this._topic = topic

    log('setup')
  }

  addPeer(key: PublicKey): this {
    this._peers.add(key)
    return this
  }

  removePeer(key: PublicKey): this {
    this._peers.delete(key)
    return this
  }

  toPeer(key: PublicKey, data: Object) {
    this._log('send to peer', key, data)
    this._pss.sendAsym(base64ToHex(key), this._topic, encodeProtocol(data))
  }
}

export default async (pss: Pss, topic: ByteArray): Promise<TopicSubject> => {
  const subscription = await pss.subscribeTopic(topic)
  return new TopicSubject(pss, topic, subscription)
}
