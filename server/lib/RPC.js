// @flow

import debug from 'debug'
import { Observable } from 'rxjs/Observable'
import type { Subject } from 'rxjs/Subject'
import { Subscriber } from 'rxjs/Subscriber'
import type { Subscription } from 'rxjs/Subscription'

const incoming = debug('dcd:rpc:<--')
const outgoing = debug('dcd:rpc:-->')

export default class RPC {
  _currentId: number = 0
  _observers: Map<number, Subscriber<*>>
  _subscribers: Set<Subscriber<*>>
  _subscription: Subscription
  _transport: Subject<Object>

  constructor(transport: Subject<Object>) {
    this._observers = new Map()
    this._subscribers = new Set()
    this._transport = transport
    this.connect()
  }

  connect() {
    this._subscription = this._transport.subscribe({
      next: (msg: Object) => {
        incoming(msg)
        if (msg.id == null) {
          this._subscribers.forEach(o => {
            o.next(msg)
          })
        } else {
          const observer = this._observers.get(msg.id)
          if (observer) {
            if (msg.error) {
              const err: Object = new Error(msg.error.message)
              err.code = msg.error.code
              observer.error(err)
              this._observers.delete(msg.id)
            } else {
              observer.next(msg.result)
            }
          } else {
            console.warn('Missing observer for message ID:', msg.id)
          }
        }
      },
      error: err => {
        this._observers.forEach(o => {
          o.error(err)
        })
        this._observers.clear()
        this._subscribers.forEach(o => {
          o.error(err)
        })
        this._subscribers.clear()
      },
      complete: () => {
        this._observers.forEach(o => {
          o.complete()
        })
        this._observers.clear()
        this._subscribers.forEach(o => {
          o.complete()
        })
        this._subscribers.clear()
      },
    })
  }

  observe(method: string, params?: Array<any> = []): Observable<any> {
    return Observable.create(observer => {
      const id = this._currentId++
      const msg = { jsonrpc: '2.0', method, id, params }
      outgoing(msg)
      this._observers.set(id, new Subscriber(observer))
      this._transport.next(
        // $FlowIgnore
        JSON.stringify(msg),
      )
      return () => {
        this._observers.delete(id)
      }
    })
  }

  promise(method: string, params?: Array<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const sub = this.observe(method, params).subscribe(
        value => {
          sub.unsubscribe()
          resolve(value)
        },
        err => {
          sub.unsubscribe()
          reject(err)
        },
        () => {
          sub.unsubscribe()
        },
      )
    })
  }

  subscribe(...args: Array<*>) {
    const subscriber = new Subscriber(...args)
    this._subscribers.add(subscriber)
    return () => {
      this._subscribers.delete(subscriber)
    }
  }
}
