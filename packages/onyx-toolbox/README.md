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

### Static configuration

The values of the `onyx` Object from the `package.json` file are exposed in the public API.

### conf: Conf

The [Conf](https://github.com/sindresorhus/conf) instance holding the dynamic toolbox configuration and local state.

### getPath(key: string): string

Returns the path matching the provided key, if set.

#### Supported keys

* `geth.bin`: the `geth` executable
* `server.bin`: the `onyx-server` executable
* `swarm.bin`: the `swarm` executable
* `swarm.data`: the Swarm data folder
* `swarm.git`: the `go-ethereum` git folder
* `swarm.pwd`: the Swarm account password file
* `swarm.root`: The Swarm folder, holding all the others

### setPath(key: string, value: string): void

Sets the path for the specified `key`. See above for the list of keys used by the toolbox.

### setPaths({[key: string]: string}): void

Sets multiple paths. See above for the list of keys used by the toolbox.

### resetPaths(): void

Resets the paths used by the toolbox.

### checkGit(): Promise<boolean>

Checks if git is installed in the environment.

### checkGo(): Promise<boolean>

Checks if Go is installed in the environment.

### gitClone(cwd: string): Promise<string>

Runs `git clone` in the provided `cwd` directory to download the supported `go-ethereum` repository.

### gitFetch(cwd: string): Promise<string>

Runs `git clone` in the provided `cwd` directory to retrieve the supported `go-ethereum` branch.

### gitFetch(cwd: string): Promise<string>

Runs `git fetch` in the provided `cwd` directory. The provided path should be the one of the `go-ethereum` repository downloaded using `gitFetch()`.

### buildBin(cwd: string, name: string): Promise<string>

Builds the binary from the `go-ethereum` repository provided by the `cwd` argument and identified by the provided `name`. Supported names are `geth` and `swarm`.

### createAccount(): Promise<string>

Creates a new BZZ account and returns its address.

### createPassword(password?: string): Promise<void>

Creates a password file containing the provided password or a default one.

### startSwarm(options = {}): Promise<false | number>

Attempts to start the Swarm process with the provided `options`. Returns the process pid or `false` if it fails.

### stopSwarm(): Promise<boolean | number>

Attempts to stop the Swarm process. Returns `false` if the process doesn't seem to be running, `true` if the process can be killed, or the process pid if it fails.

### cleanSwarm(): Promise<void>

Deletes the existing local state and removes the Swarm directory with all its contents.

### startServer(options = {}): Promise<false | {pid: number, port: number}>

Starts the Onyx server with the provided `options`. Returns `false` if it fails to start the server, or an Object containing the server `pid` and `port`.

### stopServer(): Promise<boolean | number>

Attempts to stop the Onyx server. Returns `false` if the process doesn't seem to be running, `true` if the process can be killed, or the process pid if it fails.

## License

MIT.\
See [LICENSE](LICENSE) file.
