# onyx

Decentralized messaging application based on PSS.

## Installation

Run `yarn` to install all the dependencies.

## Project structure

- `app`: electron app
- `assets`: build assets (app icons)
- `dist`: app builds
- `public`: assets that will be added to the `build` folder
- `server`: server logic handling the connection to PSS and exposing a local GraphQL server
- `src`: client source

## Development

You need a running Swarm node serving a WebSocket server on `localhost:8501` for PSS and a HTTP server on `localhost:8500`.  
These values can be changed using the environment variables `SWARM_WS_URL` and `SWARM_HTTP_URL`.

Run `yarn start` to start the development server for the frontend. It will serve it on `localhost:3000`.  
Once ready, you can run `yarn electron` to start the electron app, connecting to Swarm and creating a GraphQL server for the frontend.
