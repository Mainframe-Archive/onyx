'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TopicSubject = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _erebos = require('erebos');

var _rxjs = require('rxjs');

var _Subject = require('rxjs/Subject');

var _Subscriber = require('rxjs/Subscriber');

var _protocol = require('./protocol');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class TopicSubject extends _Subject.AnonymousSubject {

  constructor(pss, topic, subscription) {
    const topicHex = (0, _erebos.encodeHex)(topic);
    const log = (0, _debug2.default)(`dcd:pss:topic:${topicHex}`);
    const peers = new Set();

    const observer = new _Subscriber.Subscriber(data => {
      log('send to all', data);
      const msg = (0, _protocol.encodeProtocol)(data);
      peers.forEach(key => {
        pss.sendAsym((0, _erebos.base64ToHex)(key), topic, msg);
      });
    });

    const observable = pss.createSubscription(subscription)
    // $FlowIgnore
    .map(evt => {
      const sender = (0, _erebos.hexToBase64)(evt.Key);
      const data = (0, _protocol.decodeProtocol)(evt.Msg);
      if (sender && data) {
        return _extends({ sender }, data);
      } else {
        log('invalid message from subscription', msg);
      }
    }).filter(Boolean);

    super(observer, observable);
    this.hex = topicHex;
    this._log = log;
    this._peers = peers;
    this._pss = pss;
    this._topic = topic;

    log('setup');
  }

  addPeer(key) {
    this._peers.add(key);
    return this;
  }

  removePeer(key) {
    this._peers.delete(key);
    return this;
  }

  toPeer(key, data) {
    this._log('send to peer', key, data);
    this._pss.sendAsym((0, _erebos.base64ToHex)(key), this._topic, (0, _protocol.encodeProtocol)(data));
  }
}

exports.TopicSubject = TopicSubject;

exports.default = async (pss, topic) => {
  const subscription = await pss.subscribeTopic(topic);
  return new TopicSubject(pss, topic, subscription);
};