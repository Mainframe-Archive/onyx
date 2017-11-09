// @flow

import program from 'commander'

import { default as start } from './index'

program.usage('<swarm ws url> <swarm http url> <server port>').parse(process.argv)

// $FlowIgnore
const [swarmWsUrl, swarmHttpUrl, portStr] = program.args
const port = portStr ? parseInt(portStr, 10) : undefined

start(swarmWsUrl, swarmHttpUrl, port)
