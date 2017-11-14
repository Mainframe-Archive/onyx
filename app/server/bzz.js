'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _erebos = require('erebos');

var _micro = require('micro');

var _microrouter = require('microrouter');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = swarmHttpUrl => {
  const bzz = new _erebos.BZZ(swarmHttpUrl);
  const log = (0, _debug2.default)('dcd:bzz');

  return [(0, _microrouter.get)('/files/:hash', async (req, res) => {
    log('request file', req.params.hash);
    const file = await bzz.downloadRawBuffer(req.params.hash);
    if (file) {
      return file;
    }
    (0, _micro.send)(res, 404, 'not found');
  }), (0, _microrouter.post)('/files', async (req, res) => {
    const file = await (0, _micro.buffer)(req, { limit: '10mb' });
    const hash = await bzz.uploadRaw(file, {
      'content-type': req.headers['content-type']
    });
    log('uploaded file', hash);
    return hash;
  })];
};