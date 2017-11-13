'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Observable = require('rxjs/Observable');

var _utils = require('./utils');

class Pss {

  constructor(rpc) {
    this._rpc = rpc;
  }

  getBaseAddr() {
    return this._rpc.promise('pss_baseAddr');
  }

  getPublicKey() {
    return this._rpc.promise('pss_getPublicKey');
  }

  sendAsym(hexKey, topic, message) {
    return this._rpc.promise('pss_sendAsym', [hexKey, topic, message]);
  }

  sendSym(keyID, topic, message) {
    return this._rpc.promise('pss_sendSym', [keyID, topic, message]);
  }

  setPeerPublicKey(key, topic, address) {
    return this._rpc.promise('pss_setPeerPublicKey', [key, topic, address]);
  }

  setSymmetricKey(key, topic, address) {
    return this._rpc.promise('pss_setSymmetricKey', [key, topic, address, true]);
  }

  stringToTopic(str) {
    return this._rpc.promise('pss_stringToTopic', [str]);
  }

  subscribeTopic(topic) {
    return this._rpc.promise('pss_subscribe', ['receive', topic]);
  }

  createSubscription(subscription) {
    return _Observable.Observable.create(observer => {
      return this._rpc.subscribe({
        next: msg => {
          if (msg.method === 'pss_subscription' && msg.params != null && msg.params.subscription === subscription) {
            const { result } = msg.params;
            if (result && result.Msg) {
              try {
                observer.next({
                  data: (0, _utils.decodeMessage)(result.Msg),
                  keyID: result.Key
                });
              } catch (err) {
                console.warn('Error handling message', result, err);
              }
            }
          }
        },
        error: err => {
          observer.error(err);
        },
        complete: () => {
          observer.complete();
        }
      });
    });
  }

  async createTopicSubscription(topic) {
    const subscription = await this.subscribeTopic(topic);
    return this.createSubscription(subscription);
  }
}
exports.default = Pss;