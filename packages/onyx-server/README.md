# Onyx server

PSS mailboxing service for the Onyx app

## Installation

```sh
yarn add onyx-server
```

## Usage

### CLI

```sh
onyx-server --port 5000 --http-url http://localhost:8500 --ws-url ws://localhost:8546
```

All arguments are optional, when not provided the server will use environment
variables `ONYX_PORT`, `SWARM_HTTP_URL` and `SWARM_HTTP_URL` or its defaults
(WebSocket on `ws://localhost:8500`, HTTP on `http://localhost:8500` and port
5000).

Additionally you can pass `-u` or `--unsecure` to dismiss using tls, only recommended
for when connecting client and server over a local connection

The `DEBUG` environment variable can be used to activate logs, ex:

```sh
DEBUG="onyx*" onyx-server
```

### Development

To build local version run `yarn start`. Afterwards you can start the built server
from `./bin/onyx-server`.

Onyx server depends on having a local swarm node running. You can start it by running
the `start_swarm_node.sh` script. This should allow you to run `onyx-server` with
no special arguments.

in one shell:
```sh
./start_swarm_node.sh <some_swarm_data_directory_here>
```

in another shell:
```sh
yarn start
./bin/onyx-server
```

### API

```js
import Conf from 'conf'
import startServer from 'onyx-server'

startServer({
  httpUrl: 'http://localhost:8500',
  wsUrl: 'ws://localhost:8546',
  port: 5000,
  store: new Conf(),
}).then(
  server => {
    console.log('server started')
  },
  err => {
    console.log('failed to start server', err)
  },
)
```

All parameters are optional, fallback values will be used for the parameters not
provided.

## License

MIT.\
See [LICENSE](LICENSE) file.
