# Onyx contracts

Smart contracts utilities for the [Onyx app](https://github.com/MainframeHQ/onyx) and [server](https://github.com/MainframeHQ/onyx-server).

## Installation

```sh
yarn add onyx-contracts
```

## Usage

```js
import createContracts from 'onyx-contracts'

const contracts = createContracts('TESTNET') // 'MAINNET' by default when not provided
```

The `contracts` Object contains the following properties:

* `ens`
  * `getResolverAddress: (nameHash: string) => Promise<string>`
  * `getHashAddress: (contractAddress: string, nameHash: string) => Promise<string>`
  * `resolveHash: (nameHash: string) => Promise<string>`
  * `resolveName: (ensName: string) => Promise<string>`
* `staking`
  * `hasStake: (contractAddress: string, walletAddress: string) => Promise<boolean>`
  * `requiredStake: (contractAddress: string) => Promise<number>`
* `getStakingContractAddress: () => Promise<string>`
* `getRequiredStake: () => Promise<number>`
* `walletHasStake: (walletAddress: string) => Promise<boolean>`

## License

MIT.\
See [LICENSE](LICENSE) file.
