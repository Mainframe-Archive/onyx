'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createKey = exports.decodeMessage = exports.encodeMessage = exports.decodeData = exports.encodeData = exports.hexToArray = exports.hexToBase64 = exports.base64ToHex = exports.base64ToArray = exports.decodeHex = exports.encodeHex = undefined;

var _buffer = require('buffer');

var _crypto = require('crypto');

const hexToBuffer = hex => _buffer.Buffer.from(hex.substr(2), 'hex');

const encodeHex = exports.encodeHex = (input, from = 'utf8') => '0x' + _buffer.Buffer.from(input, from).toString('hex');

const decodeHex = exports.decodeHex = (hex, to = 'utf8') => hexToBuffer(hex).toString(to);

const base64ToArray = exports.base64ToArray = key => Array.from(_buffer.Buffer.from(key, 'base64'));

const base64ToHex = exports.base64ToHex = str => encodeHex(str, 'base64');

const hexToBase64 = exports.hexToBase64 = hex => decodeHex(hex, 'base64');

const hexToArray = exports.hexToArray = hex => Array.from(hexToBuffer(hex));

const encodeData = exports.encodeData = (data = {}) => encodeHex(JSON.stringify(data));

const decodeData = exports.decodeData = hex => JSON.parse(decodeHex(hex));

const encodeMessage = exports.encodeMessage = msg => Array.from(_buffer.Buffer.from(msg));

const decodeMessage = exports.decodeMessage = msg => _buffer.Buffer.from(msg, 'base64').toString();

const createKey = exports.createKey = (size = 32, asString = false) => {
  const key = (0, _crypto.randomBytes)(size);
  return asString ? _buffer.Buffer.from(key).toString('hex') : Array.from(key);
};