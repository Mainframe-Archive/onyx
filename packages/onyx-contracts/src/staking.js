// @flow

import Contract from 'web3-eth-contract'

import { callAsync } from './utils'

const STAKE_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: '_address',
        type: 'address',
      },
    ],
    name: 'hasStake',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'requiredStake',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
]

const createContract = (address: string) => new Contract(STAKE_ABI, address)

export const hasStake = (
  contractAddress: string,
  walletAddress: string,
): Promise<boolean> =>
  callAsync(createContract(contractAddress).methods.hasStake(walletAddress))

export const requiredStake = async (contractAddress: string): Promise<number> =>
  callAsync(createContract(contractAddress).methods.requiredStake())
