// @flow

import Contract from 'web3-eth-contract'

import { callAsync, namehash } from './utils'

const ENS_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32',
      },
    ],
    name: 'resolver',
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    payable: false,
    type: 'function',
  },
]

const RESOLVER_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32',
      },
    ],
    name: 'addr',
    outputs: [
      {
        name: 'ret',
        type: 'address',
      },
    ],
    payable: false,
    type: 'function',
  },
]

const NO_ADDRESS = '0x0000000000000000000000000000000000000000'

export default (ensContractAddress: string) => {
  const ensContract = new Contract(ENS_ABI, ensContractAddress)

  const getResolverAddress = async (nameHash: string): Promise<string> => {
    const address = await callAsync(ensContract.methods.resolver(nameHash))
    if (address === NO_ADDRESS) {
      throw new Error('No address')
    }
    return address
  }

  const getHashAddress = (
    contractAddress: string,
    nameHash: string,
  ): Promise<string> => {
    const resolverContract = new Contract(RESOLVER_ABI, contractAddress)
    return callAsync(resolverContract.methods.addr(nameHash))
  }

  const resolveHash = async (nameHash: string): Promise<string> => {
    const resolverAddress = await getResolverAddress(nameHash)
    return getHashAddress(resolverAddress, nameHash)
  }

  const resolveName = async (ensName: string): Promise<string> =>
    resolveHash(namehash(ensName))

  return { getResolverAddress, getHashAddress, resolveHash, resolveName }
}
