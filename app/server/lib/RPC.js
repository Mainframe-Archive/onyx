'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _Observable = require('rxjs/Observable');

var _Subscriber = require('rxjs/Subscriber');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const incoming = (0, _debug2.default)('dcd:rpc:<--');

const outgoing = (0, _debug2.default)('dcd:rpc:-->');

class RPC {

  constructor(transport) {
    this._currentId = 0;

    this._observers = new Map();
    this._subscribers = new Set();
    this._transport = transport;
    this.connect();
  }

  connect() {
    this._subscription = this._transport.subscribe({
      next: msg => {
        incoming(msg);
        if (msg.id == null) {
          this._subscribers.forEach(o => {
            o.next(msg);
          });
        } else {
          const observer = this._observers.get(msg.id);
          if (observer) {
            if (msg.error) {
              const err = new Error(msg.error.message);
              err.code = msg.error.code;
              observer.error(err);
              this._observers.delete(msg.id);
            } else {
              observer.next(msg.result);
            }
          } else {
            console.warn('Missing observer for message ID:', msg.id);
          }
        }
      },
      error: err => {
        this._observers.forEach(o => {
          o.error(err);
        });
        this._observers.clear();
        this._subscribers.forEach(o => {
          o.error(err);
        });
        this._subscribers.clear();
      },
      complete: () => {
        this._observers.forEach(o => {
          o.complete();
        });
        this._observers.clear();
        this._subscribers.forEach(o => {
          o.complete();
        });
        this._subscribers.clear();
      }
    });
  }

  observe(method, params = []) {
    return _Observable.Observable.create(observer => {
      const id = this._currentId++;
      const msg = { jsonrpc: '2.0', method, id, params };
      outgoing(msg);
      this._observers.set(id, new _Subscriber.Subscriber(observer));
      this._transport.next(
      // $FlowIgnore
      JSON.stringify(msg));
      return () => {
        this._observers.delete(id);
      };
    });
  }

  promise(method, params) {
    return new Promise((resolve, reject) => {
      const sub = this.observe(method, params).subscribe(value => {
        sub.unsubscribe();
        resolve(value);
      }, err => {
        sub.unsubscribe();
        reject(err);
      }, () => {
        sub.unsubscribe();
      });
    });
  }

  subscribe(...args) {
    const subscriber = new _Subscriber.Subscriber(...args);
    this._subscribers.add(subscriber);
    return () => {
      this._subscribers.delete(subscriber);
    };
  }
}
exports.default = RPC;