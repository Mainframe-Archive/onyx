'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Bzz {

  constructor(url) {
    this._url = url;
  }

  async uploadRaw(data, headers) {
    const res = await (0, _nodeFetch2.default)(`${this._url}/bzzr:`, {
      body: typeof data === 'string' ? _buffer.Buffer.from(data) : data,
      headers,
      method: 'POST'
    });
    const hash = await res.text();
    return hash;
  }

  downloadRaw(hash) {
    return (0, _nodeFetch2.default)(`${this._url}/bzzr:/${hash}`);
  }

  // DOM-only
  downloadRawBlob(hash) {
    return this.downloadRaw(hash).then(res => res.blob());
  }

  // node-only
  downloadRawBuffer(hash) {
    return this.downloadRaw(hash).then(res => res.buffer());
  }

  downloadRawText(hash) {
    return this.downloadRaw(hash).then(res => res.text());
  }
}
exports.default = Bzz;