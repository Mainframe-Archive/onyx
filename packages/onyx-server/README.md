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

The `DEBUG` environment variable can be used to activate logs, ex:

```sh
DEBUG="onyx*" onyx-server
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
  () => {
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
