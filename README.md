# onyx

Decentralized messaging application using PSS.

## Introduction

Onyx is a taster for our next phase of development on a fully-decentralized & incentivized network. It relies on a secure messaging protocol in the Ethereum core called [PSS](https://github.com/ethersphere/go-ethereum/tree/swarm-network-rewrite/swarm/pss).

## Installation

To install Onyx, download and install the latest release binaries for your platform from our [releases page](https://github.com/MainframeHQ/onyx/releases).

If you wish to install the mailboxing service remotely, follow the instructions in the [onyx-server](https://github.com/MainframeHQ/onyx-server) repo.

## Known issues

This application is an alpha product and is currently suitable for testing purposes only. As such, there is no guarantee of:

* **Security**: Our codebase is not fully tested. We authenticate both the client app and the mailboxing service and use TLS between the two, but any intruder who succeeded in accessing a remotely-installed service could read your messages, as they are stored in plaintext. Messages are transmitted via [PSS](https://github.com/ethersphere/go-ethereum/tree/pss/swarm/pss), which is intended to be highly secure but is still beta software.
* **Reliability**: PSS does not provide deliverability guarantees. When remotely installed, however, the [onyx-server](https://github.com/MainframeHQ/onyx-server) is designed to store messages sent to you while you are offline. As long as PSS delivers them successfully to your mailboxing service, they should be waiting for you when you open your desktop or mobile app again. If you are running in the default mode, which runs the mailbox service only locally, any messages sent to you while your app is not running will be lost.
* **Performance**: We have not sufficiently tested this version for large-scale use. All messages are stored in a global state file that gets updated with each new message that is received. We anticipate that this will not scale well. The message store was created quickly for the alpha, and will require a more robust implementation in our next phase of development.

PSS & Swarm are currently in rapid development and as such, the build of swarm that we're currently using (to have a working PSS implementation) has the following known limitations from what is expected in the next release of swarm:

* **Network Formation**: The network discovery protocol is not currently usable which means that the nodes in the network cannot optimise their routing tables to ensure good routing of messages. In order to ensure routing despite this, all "client" nodes are configured to connect to the network through the same permanent bootnode.
* **File Storage**: The file storage functionality is not currently usable which means that files uploaded to swarm would not be fetchable later. In order to retain the file upload feature, we are running a separate swarm gateway on https://onyx-storage.mainframe.com using a different build of swarm with usable file storage.

## Get in touch!

Although this release is not officially supported, we really want to hear your feedback. If you become aware of a bug or have a great idea about a feature that would make Onyx more awesome, please submit an issue on our [issues page](https://github.com/MainframeHQ/onyx/issues).

## Architecture

Onyx is a privacy-focused messaging application that combines the desired features of today's best messaging tools while also maintaining the highest level of security and user sovereignty. The product consists of front-end client apps (mobile and desktop) that connect to a p2p networking node. This node can be run on the user's desktop (inside the Onyx electron wrapper) or deployed to the cloud.

![Onyx Architecture](docs/architecture.png)

An Onyx node consists of a p2p node with a messaging layer and various services necessary for storing messages and managing contacts. It makes use of the [Swarm](https://github.com/ethersphere/swarm) distributed storage platform and [PSS](https://github.com/ethersphere/go-ethereum/tree/pss/swarm/pss) secure messaging protocol for message delivery and file storage. Later development milestones will include more rich messaging features, and incentivization for reliable message delivery.

PSS is a connectionless communication protocol that provides dark routing capabilities in addition to conventional cryptography. A configurable level of per-message routing information allows senders to choose how specific they wish to be about whom their message is addressed to. By omitting or partially omitting the recipient’s address, messages are delivered to all matching addresses, thus increasing the difficulty of identifying both sender and receiver amidst numerous duplicate messages, or of targeting specific nodes for attack or disruption. These features enable extremely secure communications. Given networks of sufficient size, dark routing makes it virtually impossible to detect messaging activity between specific nodes. The only reliable means of disrupting this communication is to disable general Internet access.

## Development

After you pull this repository, to install all the dependencies run

```
yarn
```

The app requires an [onyx-server](https://github.com/MainframeHQ/onyx-server) instance to connect to - you will be prompted when you state the app. This can be run separately, following the instructions in that repository, or can be run locally inside the electron process. To run locally, binaries for geth and swarm are required, and can be built from a known good version for the local architecture using the yarn task:

```
yarn build:binaries
```

Run

```
yarn start
```

to start the development server for the frontend. It will serve it on `localhost:3000`.

Once ready, you can start the electron app with

```
yarn electron
```

### Project structure

* `app`: electron app
* `assets`: build assets (app icons)
* `dist`: app builds
* `public`: assets that will be added to the `build` folder
* `src`: source code

### Releases

To build a release for the local architecture, run

```
yarn build:binaries
yarn dist
```

To cross-compile for MacOS, Windows, Linux, run

```
yarn build:binaries:mwl
yarn dist -mwl
```

## Contributing

Thanks for your interest in our project! Feel free to examine our list of potential enhancements on our [issues page](https://github.com/MainframeHQ/onyx/issues) and help us implement them. Feel free to submit an feature request or bug report yourself as well.

## Acknowledgments

Mainframe wishes to thank the Swarm core team, including Viktor Trón, Louis Holbrook, and Lewis Marshall, as well as the JAAK team, who helped us test the group messaging features for our presentation at Devcon3 on November 4, 2017 in Cancun, Mexico.

## License

[MIT](LICENSE)
