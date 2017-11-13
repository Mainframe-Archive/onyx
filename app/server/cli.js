'use strict';

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.usage('<swarm ws url> <swarm http url> <server port>').parse(process.argv);

// $FlowIgnore
const [swarmWsUrl, swarmHttpUrl, portStr] = _commander2.default.args;
const port = portStr ? parseInt(portStr, 10) : undefined;

(0, _index2.default)(swarmWsUrl, swarmHttpUrl, port);