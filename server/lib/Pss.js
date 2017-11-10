// @flow

import { Observable } from 'rxjs/Observable'

import type RPC from './RPC'
import { decodeMessage, encodeHex } from './utils'

export type ByteArray = Array<number>

export default class Pss {
  _rpc: RPC

  constructor(rpc: RPC) {
    this._rpc = rpc
  }

  getBaseAddr(): Promise<string> {
    return this._rpc.promise('pss_baseAddr')
  }

  getPublicKey(): Promise<string> {
    return this._rpc.promise('pss_getPublicKey')
  }

  sendAsym(
    hexKey: string,
    topic: ByteArray,
    message: ByteArray,
  ): Promise<null> {
    return this._rpc.promise('pss_sendAsym', [hexKey, topic, message])
  }

  sendSym(keyID: string, topic: ByteArray, message: ByteArray): Promise<null> {
    return this._rpc.promise('pss_sendSym', [keyID, topic, message])
  }

  setPeerPublicKey(
    key: ByteArray,
    topic: ByteArray,
    address: string,
  ): Promise<null> {
    return this._rpc.promise('pss_setPeerPublicKey', [key, topic, address])
  }

  setSymmetricKey(
    key: ByteArray,
    topic: ByteArray,
    address: string,
  ): Promise<string> {
    return this._rpc.promise('pss_setSymmetricKey', [key, topic, address, true])
  }

  stringToTopic(str: string): Promise<ByteArray> {
    return this._rpc.promise('pss_stringToTopic', [str])
  }

  subscribeTopic(topic: ByteArray): Promise<string> {
    return this._rpc.promise('pss_subscribe', ['receive', topic])
  }

  createSubscription(subscription: string): Observable<Object> {
    return Observable.create(observer => {
      return this._rpc.subscribe({
        next: msg => {
          if (
            msg.method === 'pss_subscription' &&
            msg.params != null &&
            msg.params.subscription === subscription
          ) {
            const { result } = msg.params
            if (result && result.Msg) {
              try {
                observer.next({
                  data: decodeMessage(result.Msg),
                  keyID: result.Key,
                })
              } catch (err) {
                console.warn('Error handling message', result, err)
              }
            }
          }
        },
        error: err => {
          observer.error(err)
        },
        complete: () => {
          observer.complete()
        },
      })
    })
  }

  async createTopicSubscription(topic: ByteArray): Promise<Observable<Object>> {
    const subscription = await this.subscribeTopic(topic)
    return this.createSubscription(subscription)
  }
}
