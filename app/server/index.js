'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _client = require('./pss/client');

var _server = require('./server');

var _server2 = _interopRequireDefault(_server);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const start = async (swarmWsUrl, swarmHttpUrl, serverPort, appPort) => {
  // Connect to local Swarm node, this also makes the node's address and public key available in the db module
  const pss = await (0, _client.setupPss)(swarmWsUrl, `http://localhost:${appPort}`);
  // Start listening to the "contact request" topic and handle these requests
  await (0, _client.setupContactTopic)(pss);
  // Set subscriptions for stored convos
  await (0, _client.subscribeToStoredConvos)(pss);
  // Start the GraphQL server
  await (0, _server2.default)(pss, swarmHttpUrl, serverPort);
};

exports.default = start;