# onyx

Decentralized messaging application based on PSS.

## Introduction

TODO: what is PSS + links to Devcon blog posts and video.

## Know issues

This application is only a proof of concept, it is only meant for demonstration purposes. As such, there is no guaranty of:

- Security: our codebase is not fully tested.
- Reliability: PSS does not provide deliverability guaranties.
- Performance: this POC is only meant for demonstration between a few users, it is not designed for wider scale or frequent usage.

## Architecture

TODO: use slide from demo?

## Development

You need a running Swarm node serving a WebSocket server on `localhost:8501` for PSS and a HTTP server on `localhost:8500`.  
These values can be changed using the environment variables `SWARM_WS_URL` and `SWARM_HTTP_URL`.

After you pull this repository, run `yarn` to install all the dependencies.

Run `yarn start` to start the development server for the frontend. It will serve it on `localhost:3000`.  
Once ready, you can run `yarn electron` to start the electron app, connecting to Swarm and creating a GraphQL server for the frontend.

### Project structure

- `app`: electron app
- `assets`: build assets (app icons)
- `dist`: app builds
- `public`: assets that will be added to the `build` folder
- `server`: server logic handling the connection to PSS and exposing a local GraphQL server
- `src`: client source

## Contributing

(TODO) See [CONTRIBUTING](CONTRIBUTING.md) file.

## License

[MIT](LICENSE)
