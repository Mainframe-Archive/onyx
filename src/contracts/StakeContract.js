// @flow

import Web3Contract from 'web3-eth-contract'
import { WEB3_URLS, ENS_NAMES } from '../constants'
import ResolverContract from './ResolverContract'

const STAKE_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'requiredStake',
    outputs: [
      {
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
]

export default (ethNetwork: string) => {
  Web3Contract.setProvider(WEB3_URLS[ethNetwork])

  const requiredStake = async (): Promise<number> => {
    const resolverContract = ResolverContract(ethNetwork)
    const stakeAddress = await resolverContract.resolve(ENS_NAMES.stake[ethNetwork])
    const stakeContract = new Web3Contract(STAKE_ABI, stakeAddress)
    return new Promise((resolve, reject) => {
      stakeContract.methods.requiredStake().call((err, stake) => {
        if (err) reject(err)
        else resolve(stake)
      })
    })
  }

  return { requiredStake }
}
