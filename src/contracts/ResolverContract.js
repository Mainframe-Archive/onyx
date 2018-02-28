// @flow

import Web3Contract from 'web3-eth-contract'
import { ENS_ADDRESSES, WEB3_URLS } from '../constants'
import { namehash } from './contract-utils'

const ENS_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      }
    ],
    name: 'resolver',
    outputs: [
      {
        name: '',
        type: 'address'
      }
    ],
    payable: false,
    type: 'function'
  },
]

const RESOLVER_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      }
    ],
    name: 'addr',
    outputs: [
      {
        name: 'ret',
        type: 'address'
      }
    ],
    payable: false,
    type: 'function'
  },
]

const NO_ADDRESS = '0x0000000000000000000000000000000000000000'

export default (ethNetwork: string) => {
  Web3Contract.setProvider(WEB3_URLS[ethNetwork])
  const ensContract = new Web3Contract(ENS_ABI, ENS_ADDRESSES[ethNetwork])

  const getResolverAddress = (nameHash: string): Promise<string> =>
    new Promise((resolve, reject) => {
      ensContract.methods.resolver(nameHash).call((err, address) => {
        if (err) reject(err)
        else if (address === NO_ADDRESS) reject(new Error('No address'))
        else resolve(address)
      })
    })

  const resolveHash = (resolver: string, nameHash: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const resolverContract = new Web3Contract(RESOLVER_ABI, resolver)
      resolverContract.methods.addr(nameHash).call((err, res) => {
        if (err) reject(err)
        else resolve(res)
      })
    })

  const resolve = async (ensName: string): Promise<string> => {
    const ensHash = namehash(ensName)
    try {
      const resolverAddress = await getResolverAddress(ensHash)
      return resolveHash(resolverAddress, ensHash)
    } catch(err) {
      console.warn(err)
      return Promise.reject(err)
    }
  }


  return { resolve }
}
