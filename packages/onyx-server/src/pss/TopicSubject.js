// @flow

import debug from 'debug'
import type { hex, PssAPI } from 'erebos'
import { Observable } from 'rxjs'
import { AnonymousSubject } from 'rxjs/Subject'
import { Subscriber } from 'rxjs/Subscriber'

import { decodeProtocol, encodeProtocol, type ProtocolEvent } from './protocol'

export class TopicSubject extends AnonymousSubject<Object> {
  id: hex

  _log: (...args: *) => void
  _peers: Set<hex>
  _pss: PssAPI

  constructor(pss: PssAPI, topic: hex, subscription: hex) {
    const log = debug(`onyx:pss:topic:${topic}`)
    const peers = new Set()

    const observer = new Subscriber((data: Object) => {
      log('send to all', data)
      const msg = encodeProtocol(data)
      peers.forEach(key => {
        pss.sendAsym(key, topic, msg)
      })
    })

    const observable = pss
      .createSubscription(subscription)
      // $FlowFixMe
      .map(evt => {
        const data = decodeProtocol(evt.Msg)
        if (evt.Key && data) {
          return { sender: evt.Key, ...data }
        } else {
          log('invalid message from subscription', evt)
        }
      })
      .filter(Boolean)

    // $FlowFixMe: Subscriber type
    super(observer, observable)
    this.id = topic
    this._log = log
    this._peers = peers
    this._pss = pss

    log('setup')
  }

  addPeer(key: hex): this {
    this._peers.add(key)
    return this
  }

  removePeer(key: hex): this {
    this._peers.delete(key)
    return this
  }

  toPeer(key: hex, data: Object): this {
    this._log('send to peer', key, data)
    this._pss.sendAsym(key, this.id, encodeProtocol(data))
    return this
  }
}

export default async (pss: PssAPI, topic: hex): Promise<TopicSubject> => {
  const subscription = await pss.subscribeTopic(topic)
  return new TopicSubject(pss, topic, subscription)
}
