# onyx

Decentralized messaging application based on PSS.

## License

Copyright 2017 ThusFresh, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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
