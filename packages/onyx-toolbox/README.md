# Onyx toolbox

Environment tools for the [Onyx server](https://github.com/MainframeHQ/onyx-server)

## Prerequisites

[Node](https://nodejs.org/en/) v8+ with [npm](https://www.npmjs.com/).

## Installation

```sh
npm install --global onyx-toolbox
```

## CLI

```
Usage
  onyx <command>

Commands
  clean - Clean the environment created by the setup
  help <command> - Information and available flags for the specified command
  reset - Reset the environment, same as clean + setup
  setup - Setup the environment
  start - Start the Onyx server
  stop - Stop the Onyx server
  swarm <action> - Swarm commands
```

## API

Work in progress - check the `lib/api.js` and `lib/config.js` files to see the public API.

## License

MIT.\
See [LICENSE](LICENSE) file.
