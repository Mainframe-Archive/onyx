// @flow

import program from 'commander'

import { default as start } from './index'

program
  .option(
    '-w, --ws-url <url>',
    'Swarm node WebSocket URL, defaults to ws://localhost:8546',
  )
  .option(
    '-h, --http-url <url>',
    'Swarm node HTTP URL, defaults to http://localhost:8500',
  )
  .option('-p, --port <port>', 'port for the GraphQL server, defaults to 5000')
  .option('-u, --unsecure', 'flag to dismiss using TLS')
  .option('-c, --certs-dir <path>', 'set ssl certificates directory path')
  .parse(process.argv)

start({
  wsUrl: program.wsUrl,
  httpUrl: program.httpUrl,
  port: program.port ? parseInt(program.port, 10) : undefined,
  unsecure: program.unsecure,
  certsDir: program.certsDir,
})
