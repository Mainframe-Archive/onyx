// @flow

import Contract from 'web3-eth-contract'

import { ENS_ADDRESSES, ENS_STAKE_NAMES, WEB3_URLS } from './constants'
import createEns from './ens'
import * as staking from './staking'
import { namehash } from './utils'

type Network = 'TESTNET' | 'MAINNET'

export default (ethNetwork?: Network = 'MAINNET') => {
  Contract.setProvider(WEB3_URLS[ethNetwork])

  const ens = createEns(ENS_ADDRESSES[ethNetwork])
  const stakingContractHash = namehash(ENS_STAKE_NAMES[ethNetwork])
  const getStakingContractAddress = () => ens.resolveHash(stakingContractHash)

  const getRequiredStake = async (): Promise<number> =>
    staking.requiredStake(await getStakingContractAddress())

  const walletHasStake = async (walletAddress: string): Promise<boolean> =>
    staking.hasStake(await getStakingContractAddress(), walletAddress)

  return {
    ens,
    staking,
    getStakingContractAddress,
    getRequiredStake,
    walletHasStake,
  }
}
