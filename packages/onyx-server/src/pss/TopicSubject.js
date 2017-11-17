// @flow

import debug from 'debug'
import {
  base64ToHex,
  hexToBase64,
  encodeHex,
  type PSS,
  type topic,
} from 'erebos'
import { Observable } from 'rxjs'
import { AnonymousSubject } from 'rxjs/Subject'
import { Subscriber } from 'rxjs/Subscriber'

import { decodeProtocol, encodeProtocol, type ProtocolEvent } from './protocol'

type publicKey = string

export class TopicSubject extends AnonymousSubject<Object> {
  hex: string

  _log: (...args: *) => void
  _peers: Set<publicKey>
  _pss: PSS
  _topic: topic

  constructor(pss: PSS, topic: topic, subscription: string) {
    // $FlowFixMe
    const topicHex = encodeHex(topic)
    const log = debug(`onyx:pss:topic:${topicHex}`)
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
      // $FlowFixMe
      .map(evt => {
        const sender = hexToBase64(evt.Key)
        const data = decodeProtocol(evt.Msg)
        if (sender && data) {
          return { sender, ...data }
        } else {
          log('invalid message from subscription', evt)
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

  addPeer(key: publicKey): this {
    this._peers.add(key)
    return this
  }

  removePeer(key: publicKey): this {
    this._peers.delete(key)
    return this
  }

  toPeer(key: publicKey, data: Object) {
    this._log('send to peer', key, data)
    this._pss.sendAsym(base64ToHex(key), this._topic, encodeProtocol(data))
  }
}

export default async (pss: PSS, topic: topic): Promise<TopicSubject> => {
  const subscription = await pss.subscribeTopic(topic)
  return new TopicSubject(pss, topic, subscription)
}
