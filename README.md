# onyx

Decentralized messaging application based on PSS.

## Introduction

Onyx is a proof of concept for our next phase of development on a fully-decentralized messaging platform. It relies on a secure messaging protocol in the Ethereum core called [PSS](https://gist.github.com/zelig/d52dab6a4509125f842bbd0dce1e9440).

## Installing

To install onyx, download and install the latest release binaries for your platform from our [releases page](https://github.com/thusfresh/onyx/releases).

## Know issues

This application is only a proof of concept. It is meant for demonstration purposes. As such, there is no guarantee of:

- Security: our codebase is not fully tested.
- Reliability: PSS does not provide deliverability guarantees.
- Performance: this POC is only meant for demonstration between a few users. It is not designed for wide-scale or frequent usage.

If you become aware of a bug or important missing feature, please submit an issue on our [issues page](https://github.com/thusfresh/onyx/issues).

## Architecture

TODO: use slide from demo?

## Running

To run the swarm node onyx is going to connect to, run 
`$ ./start_node.sh <your desired account data directory>`.
The script will clone and build the right version of go-ethereum on your
machine.
You'll need to have `jq` installed for the script to work.

To run the built app run `yarn dist` and run the built app which is `dist/mac/Onyx`.

## Development

You need a running Swarm node serving a WebSocket server on `localhost:8546` for PSS and a HTTP server on `localhost:8500`.  
These values can be changed using the environment variables `SWARM_WS_URL` and `SWARM_HTTP_URL`.

After you pull this repository, run `yarn` to install all the dependencies.

Run `yarn start` to start the development server for the frontend. It will serve it on `localhost:3000`.  
Once ready, you can run `yarn electron` to start the electron app, connecting to Swarm and creating a GraphQL server for the frontend.

### Project structure

- `app`: electron app
- `assets`: build assets (app icons)
- `dist`: app builds
- `public`: assets that will be added to the `build` folder
- `src`: source code

## Contributing

Thanks for your interest in our project! Feel free to examine our list of potential enhancements on our [issues page](https://github.com/thusfresh/onyx/issues) and help us implement them. Feel free to submit an feature request or bug report yourself as well.

## License

[MIT](LICENSE)
