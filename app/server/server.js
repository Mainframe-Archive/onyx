'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _micro = require('micro');

var _micro2 = _interopRequireDefault(_micro);

var _microCors = require('micro-cors');

var _microCors2 = _interopRequireDefault(_microCors);

var _microrouter = require('microrouter');

var _bzz = require('./bzz');

var _bzz2 = _interopRequireDefault(_bzz);

var _server = require('./graphql/server');

var _server2 = _interopRequireDefault(_server);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (pss, swarmHttpUrl, port) => {
  return new Promise((resolve, reject) => {
    const log = (0, _debug2.default)('dcd:server');
    const bzzRoutes = (0, _bzz2.default)(swarmHttpUrl);
    const graphql = (0, _server2.default)(pss, port);

    const server = (0, _micro2.default)((0, _microCors2.default)()((0, _microrouter.router)(...graphql.routes, ...bzzRoutes, (req, res) => (0, _micro.send)(res, 404, 'not found'))));
    server.listen(port, 'localhost', err => {
      if (err) {
        reject(err);
      } else {
        log(`running on port ${port}`);
        graphql.onCreated(server);
        resolve();
      }
    });
  });
};