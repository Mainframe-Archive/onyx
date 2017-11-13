'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ip = require('ip');

var _ip2 = _interopRequireDefault(_ip);

var _client = require('./pss/client');

var _server = require('./server');

var _server2 = _interopRequireDefault(_server);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const SWARM_WS_URL = process.env.SWARM_WS_URL || 'ws://localhost:8547';

const SWARM_HTTP_URL = process.env.SWARM_HTTP_URL || 'http://localhost:8500';
const SERVER_PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 5001;
const APP_PORT = process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 3000;

const start = async (swarmWsUrl = SWARM_WS_URL, swarmHttpUrl = SWARM_HTTP_URL, serverPort = SERVER_PORT, appPort = APP_PORT) => {
  const appUrl = `http://${_ip2.default.address()}:${appPort}`;
  // Connect to local Swarm node, this also makes the node's address and public key available in the db module
  const pss = await (0, _client.setupPss)(swarmWsUrl, appUrl);
  // Start listening to the "contact request" topic and handle these requests
  await (0, _client.setupContactTopic)(pss);
  // Set subscriptions for stored convos
  await (0, _client.subscribeToStoredConvos)(pss);
  // Start the GraphQL server
  await (0, _server2.default)(pss, swarmHttpUrl, serverPort);
};

exports.default = start;