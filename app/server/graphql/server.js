'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _apolloServerMicro = require('apollo-server-micro');

var _graphql = require('graphql');

var _microrouter = require('microrouter');

var _subscriptionsTransportWs = require('subscriptions-transport-ws');

var _schema = require('./schema');

var _schema2 = _interopRequireDefault(_schema);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (pss, port) => {
  const schema = (0, _schema2.default)(pss, port);
  const graphqlHandler = (0, _apolloServerMicro.microGraphql)({ schema });
  const graphiqlHandler = (0, _apolloServerMicro.microGraphiql)({ endpointURL: '/graphql' });

  return {
    routes: [(0, _microrouter.get)('/graphql', graphqlHandler), (0, _microrouter.post)('/graphql', graphqlHandler), (0, _microrouter.get)('/graphiql', graphiqlHandler)],
    onCreated: server => {
      _subscriptionsTransportWs.SubscriptionServer.create({ execute: _graphql.execute, schema, subscribe: _graphql.subscribe }, { path: '/graphql', server });
    }
  };
};