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

We would also love to chat with you on the Onyx app! To converse with us there, add any member of the Mainframe team and send us ideas:

* Adam Clarke: `0x0477eaa897f071943fc0be577eee161dcc06a72e785437ce14f2d9acbc829885f0cd6db9e3ee21cb2b660cb191877808288168f4ebc4a2cdafb6490e54f9302ba8`
* Austin Craig: `0x049b12d92928e83c5813e7f6e87b25c3d3d13750d26eb42a4205b7752a1d3f8f3e7f09d455741b9198d15ed8eaa40b2c477901a96c6f861b7f46cc5b38a91e7bba`
* Brad Hagen: `0x047d7e236d470739b173d06e7d602020104dcc17e172fc1a87b23d802a66c78e1d5edb2c8b0bcaf8a51aab1dfccd17a79956368d541712045972b740dd2add417f`
* Carl Youngblood: `0x04247be9d69b6e48f81f1b59bcb4cd13474d708e37d13952e5c89de39e2797eec1f0295a0140f29278d5363c07b2ebf9e5b4b821dccdbc453d3bc516df3ba8538f`
* Clément Jaquier: `0x04a5e89b2a943981c78c391e10cf937fec8c0d5d8f979f24b794ae5758d3b4ec7495686b056485539ea7f367827da08252ee59de7bef7e26e750ae2815a7a05c31`
* Diogo Perillo: `0x0432145fbf8bdc9ee9cdfaf9f09c1c9cfbf03d746ed8995c0f0b1b13b981b6623768f3098f95101da5243fb5bfbb6a7197c5fe4279235a718de227a3259d827bb1`
* Luca Tavazzani: `0x047c32067adf821dd855af247c87d4ef16e083a8bff507849e5347c90b90c77cad6eca4b8a05f744c29827b76ce208e67ad84dcb0a39e190eace1aa1f06e5fa067`
* Matt Larson: `0x04ee7a0f698c182efc6c179a96b2cf42fd9a25040cca403682014859f6042958566091a42ad2d70d7b0f1dfabbaf1d3cc54c72fe852f1f1a431ee7896ef2006872`
* Mick Hagen: `0x04de5bc3ce9c1b229ccd194592b476950815c81dfb105a7fa8981a222d4be7b79f0921858f96dcc6a88fe17c5cf68de4ddedb3e91dba07a91661e10f162e0ee19b`
* Miloš Mošić: `0x04a6535173ed708a043e0a35223f52a380c9052a15309c45e63ad603de2b9800b435359f235c7463dfb1e77278eb81e7347881a3b4156eb6d0bee06302fdf79fb2`
* Paul Le Cam: `0x045d750ff03b4809304f7a201398c845568e55e6c516c7ca2cfcc7f2b0c04f52fda6164539988bf0447df57bf4671958cccbaad92353f9346920e2084451f7a830`
* Shane Howley: `0x04eecabffd2b9cf84e03cf46b720200752375c08e20cf1275af8064e8624ef912b8c8e0f89b376c18c5ac317eb5cbe98fdf59ac0b746322570119eb63e3cce073e`

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
