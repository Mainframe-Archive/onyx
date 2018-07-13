// @flow

import createContracts from 'onyx-contracts'
import React, { Component } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native-web'
import abi from 'web3-eth-abi'
import Web3Contract from 'web3-eth-contract'
import web3Utils from 'web3-utils'

import { ENS_NAMES } from '../constants'
import { onSetWsUrl } from '../data/Electron'

import Icon from './Icon'
import Text from './Text'
import TextInput from './Form/TextInput'
import Button from './Form/Button'
import Modal from './Modal'
import CertSelectionModal, { storedCerts } from './CertSelectionModal'
import MainframeBar, { FOOTER_SIZE } from './MainframeBar'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

const shell = window.require('electron').shell

const TOKEN_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address',
      },
      {
        name: '_spender',
        type: 'address',
      },
    ],
    name: 'allowance',
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

const WEB3_URLS = {
  TESTNET: 'https://ropsten.infura.io/KWLG1YOMaYgl4wiFlcJv',
  MAINNET: 'https://mainnet.infura.io/KWLG1YOMaYgl4wiFlcJv',
}

type Props = {
  address: ?string,
  defaultLocalhostUrl: string,
  storedServerUrl: string,
  connectionError: string,
  ethNetwork: 'MAINNET' | 'TESTNET',
}

type State = {
  url: ?string,
  loadingLocal: boolean,
  loadingRemote: boolean,
  showCertsSelectModal?: boolean,
  stakeStep: number,
  whitelistAddress: ?string,
  ethAddress: string,
  ensError?: string,
  allowanceCheckError?: string,
  allowanceApproved?: boolean,
  awaitingApproval?: boolean,
  awaitingStake?: boolean,
  showEthAddressError?: string,
}

export default class NodeConnectionView extends Component<Props, State> {
  constructor(props: Props) {
    super(props)

    const stakeRequired =
      props.connectionError &&
      props.connectionError.startsWith('You need to stake')

    this.state = {
      url: props.storedServerUrl,
      loadingLocal: false,
      loadingRemote: false,
      stakeStep: 1,
      whitelistAddress: props.address,
      showStakingModal: stakeRequired,
      stakeRequired,
      ethAddress: '',
    }
  }

  componentDidMount() {
    if (this.state.stakeRequired) {
      this.resolveEns()
    }
  }

  resolveEns = async () => {
    const { ethNetwork } = this.props
    const contracts = createContracts(ethNetwork)
    try {
      const [requiredStake, stakeAddress, tokenAddress] = await Promise.all([
        contracts.getRequiredStake(),
        contracts.ens.resolveName(ENS_NAMES.stake[ethNetwork]),
        contracts.ens.resolveName(ENS_NAMES.token[ethNetwork]),
      ])
      Web3Contract.setProvider(WEB3_URLS[ethNetwork])
      const tokenContract = new Web3Contract(TOKEN_ABI, tokenAddress)
      this.setState({
        requiredStake,
        tokenAddress,
        stakeAddress,
        ensError: null,
        tokenContract,
        contracts,
      })
    } catch (err) {
      console.warn('err: ', err)
      this.setState({
        ensError: err,
      })
    }
  }

  onChangeUrl = (value: string) => {
    this.setState({
      url: value,
    })
  }

  onPressConnect = () => {
    const { url } = this.state
    if (url && url.length) {
      const secure = url.split('://')[0] === 'wss'
      const certs = storedCerts()
      if (secure && (!certs || certs.wsUrl !== url)) {
        this.setState({
          showCertsSelectModal: true,
        })
      } else {
        this.setState({ loadingRemote: true })
        onSetWsUrl(url)
      }
    }
  }

  onPressConnectDefault = () => {
    this.setState({ loadingLocal: true })
    onSetWsUrl('local')
  }

  onCopiedCerts = () => {
    onSetWsUrl(this.state.url)
  }

  onRequestClose = () => {
    this.setState({
      showCertsSelectModal: false,
    })
  }

  onPressApprove = () => {
    const { stakeAddress, requiredStake } = this.state
    const encodedApproveCall = abi.encodeFunctionCall(
      {
        name: 'approve',
        type: 'function',
        inputs: [
          {
            type: 'address',
            name: '_spender',
          },
          {
            type: 'uint256',
            name: '_value',
          },
        ],
      },
      [stakeAddress, requiredStake],
    )
    const url = `https://legacy.mycrypto.com/?to=${
      this.state.tokenAddress
    }&value=0&gaslimit=100000&data=${encodedApproveCall}#send-transaction`
    shell.openExternal(url)
    this.setState({
      awaitingApproval: true,
    })
    this.beginCheckingApproval()
  }

  beginCheckingApproval = async () => {
    const approved = await this.hasAllowance()
    if (approved) {
      this.setState({
        stakeStep: 3,
      })
    } else {
      setTimeout(this.beginCheckingApproval, 3000)
    }
  }

  onChangeEthAddress = (value: string) => {
    this.setState({
      ethAddress: value,
    })
  }

  onChangeWhitelistAddress = (value: string) => {
    this.setState({
      whitelistAddress: value,
    })
  }

  onPressDepositAndWhitelist = () => {
    const { whitelistAddress } = this.state
    if (web3Utils.isAddress(whitelistAddress)) {
      this.setState({
        showWhitelistError: false,
      })

      const encodedWhitelistCall = abi.encodeFunctionCall(
        {
          name: 'stake',
          type: 'function',
          inputs: [
            {
              name: 'whitelistAddress',
              type: 'address',
            },
          ],
        },
        [whitelistAddress],
      )
      const url = `https://legacy.mycrypto.com/?to=${
        this.state.stakeAddress
      }&value=0&gaslimit=150000&data=${encodedWhitelistCall}#send-transaction`
      shell.openExternal(url)
      this.setState({
        stakeStep: 3,
        awaitingStake: true,
      })
      this.beginCheckingStake()
    } else {
      this.setState({
        showWhitelistError: true,
      })
    }
  }

  beginCheckingStake = async () => {
    const hasStake = await this.state.contracts.walletHasStake(
      this.state.whitelistAddress,
    )
    if (hasStake) {
      this.setState({
        awaitingStake: false,
        stakeStep: 4,
      })
    } else {
      setTimeout(this.beginCheckingStake, 3000)
    }
  }

  onRequestCloseStake = () => {
    this.setState({
      showStakingModal: false,
    })
  }

  onPressFinishStake = () => {
    this.setState({
      showStakingModal: false,
    })
    this.onPressConnectDefault()
  }

  hasAllowance = async () => {
    const {
      stakeAddress,
      ethAddress,
      tokenContract,
      requiredStake,
    } = this.state
    try {
      const res = await tokenContract.methods
        .allowance(ethAddress, stakeAddress)
        .call()
      return res >= requiredStake
    } catch (err) {
      this.setState({
        allowanceCheckError: 'Error checking allowance',
      })
    }
  }

  onPressConfirmEthAddress = async () => {
    if (!web3Utils.isAddress(this.state.ethAddress)) {
      this.setState({
        showEthAddressError: 'Invalid eth address',
      })
      return
    }
    const approved = await this.hasAllowance()
    if (approved) {
      this.setState({
        stakeStep: 3,
        showEthAddressError: undefined,
      })
    } else {
      this.setState({
        stakeStep: 2,
        showEthAddressError: undefined,
      })
    }
  }

  // RENDER

  renderLocalConnectButton() {
    const { loadingLocal } = this.state
    const loadingStyles = loadingLocal ? null : styles.hide
    const buttonStyles = loadingLocal ? styles.hide : null
    return (
      <View>
        <TouchableOpacity
          onPress={this.onPressConnectDefault}
          style={[styles.defaultNodeButton, buttonStyles]}>
          <View style={styles.buttonText}>
            <Text style={styles.defaultNodeButtonTitle}>
              Start local Onyx server
            </Text>
          </View>
          <Icon name="arrow-right" />
        </TouchableOpacity>
        <View style={loadingStyles}>
          <Icon name="rolling" />
        </View>
      </View>
    )
  }

  renderRemoteConnectButton() {
    const { loadingRemote } = this.state
    const loadingStyles = loadingRemote ? null : styles.hide
    const buttonStyles = loadingRemote ? styles.hide : null
    return (
      <View>
        <Button
          style={buttonStyles}
          outlineStyle
          title="Connect to remote server"
          onPress={this.onPressConnect}
        />
        <View style={loadingStyles}>
          <Icon name="rolling" />
        </View>
      </View>
    )
  }

  renderEnsError() {
    return (
      <Modal onRequestClose={this.onRequestCloseStake} title="ENS Error" isOpen>
        <View>
          <Text style={styles.stakeInfoText}>
            Sorry, there was a problem resolving ens.
          </Text>
          <Text style={styles.errorMessageText}>
            Error: {this.state.ensError.message}
          </Text>
          <Button title="Retry" onPress={this.resolveEns} />
        </View>
      </Modal>
    )
  }

  renderStakeRequiredModal() {
    if (this.state.ensError) {
      return this.renderEnsError()
    }
    const showWhitelistError = this.state.showWhitelistError ? (
      <Text style={styles.errorMessage}>* Invalid ETH address</Text>
    ) : null

    const ethAddressError = this.state.showEthAddressError ? (
      <Text style={styles.errorMessage}>* Invalid ETH address</Text>
    ) : null
    const step1 = (
      <View>
        <Text style={styles.stakeInfoText}>
          To participate in the Mainframe network you are required to stake one
          Mainframe token (1 MFT) to our staking contract. This requires two
          transactions, one to approve the deposit and a second to make the
          deposit and whitelist your node address.
        </Text>
        <Text style={styles.stakeInfoHeader}>Step 1</Text>
        <Text style={styles.stakeInfoText}>Please enter your ETH address.</Text>
        <TextInput
          value={this.state.ethAddress}
          placeholder="ETH address"
          onChangeText={this.onChangeEthAddress}
        />
        <Button
          title="Confirm your ETH address"
          onPress={this.onPressConfirmEthAddress}
        />
        {ethAddressError}
      </View>
    )
    const step2 = !this.state.awaitingApproval ? (
      <View>
        <Text style={styles.stakeInfoHeader}>Step 2</Text>
        <Text style={styles.stakeInfoText}>
          Approve our staking contract to take your deposit. You will need at
          least 1 MFT in your wallet and a small amount of ETH to cover
          transaction fees.
        </Text>
        <TextInput
          disabled
          value={this.state.ethAddress}
          placeholder="ETH address"
          onChangeText={this.onChangeEthAddress}
        />
        <Button
          title="Step 1 - Approve deposit of 1 MFT"
          onPress={this.onPressApprove}
        />
      </View>
    ) : (
      <View>
        <ActivityIndicator style={styles.activityIndicator} />
        <Text style={styles.waitingText}>
          Please check back once your transaction has been mined
        </Text>
      </View>
    )

    const step3 = this.state.awaitingStake ? (
      <View>
        <ActivityIndicator style={styles.activityIndicator} />
        <Text style={styles.waitingText}>Awaiting transaction to be mined</Text>
      </View>
    ) : (
      <View>
        <Text style={styles.stakeInfoHeader}>Step 3</Text>
        <Text style={styles.stakeInfoText}>Stake for your node address</Text>
        {showWhitelistError}
        <Button
          title="Step 3 - Deposit 1 MFT and whitelist node"
          onPress={this.onPressDepositAndWhitelist}
        />
      </View>
    )
    const step4 = (
      <View>
        <Text style={styles.stakeInfoText}>
          Stake complete, please restart your node when ready.
        </Text>
        <Button title="Restart local node" onPress={this.onPressFinishStake} />
      </View>
    )
    const steps = [step1, step2, step3, step4]
    return (
      <Modal
        onRequestClose={this.onRequestCloseStake}
        title="Stake Mainframe Token"
        isOpen={this.state.showStakingModal}>
        {steps[this.state.stakeStep - 1]}
      </Modal>
    )
  }

  render() {
    const connectionErrorMessage = this.props.connectionError ? (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{this.props.connectionError}</Text>
      </View>
    ) : null

    const certSelectionModal = this.state.showCertsSelectModal ? (
      <CertSelectionModal
        wsUrl={this.state.url}
        onRequestClose={this.onRequestClose}
        onCopiedCerts={this.onCopiedCerts}
      />
    ) : null

    return (
      <View style={styles.outer}>
        {connectionErrorMessage}
        {this.renderStakeRequiredModal()}
        <View style={styles.container}>
          {certSelectionModal}
          <View style={styles.innerContainer}>
            <View style={styles.icon}>
              <Icon name="mainframe-icon" />
            </View>
            {this.renderLocalConnectButton()}
            <View style={styles.separator}>
              <View style={[styles.separatorLine, styles.lineLeft]} />
              <Text style={styles.separatorLabel}>OR</Text>
              <View style={[styles.separatorLine, styles.lineRight]} />
            </View>
            <TextInput
              white
              value={this.state.url}
              placeholder="Onyx server websocket url"
              onChangeText={this.onChangeUrl}
            />
            {this.renderRemoteConnectButton()}
          </View>
          <MainframeBar footer />
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingBottom: FOOTER_SIZE,
  },
  innerContainer: {
    width: 320,
  },
  icon: {
    marginBottom: BASIC_SPACING * 4,
  },
  defaultNodeButton: {
    height: 50,
    borderRadius: 25,
    marginBottom: BASIC_SPACING,
    backgroundColor: COLORS.PRIMARY_RED,
    paddingHorizontal: BASIC_SPACING * 2,
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  buttonText: {
    flexDirection: 'column',
  },
  defaultNodeButtonTitle: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
  },
  defaultNodeButtonSubtitle: {
    color: COLORS.WHITE,
    fontSize: 11,
  },
  separatorLabel: {
    fontSize: 11,
    color: COLORS.GRAY_47,
    marginHorizontal: BASIC_SPACING,
  },
  separator: {
    marginVertical: BASIC_SPACING * 1.5,
    flexDirection: 'row',
  },
  separatorLine: {
    flex: 1,
    height: 1,
    marginTop: 8,
    backgroundColor: COLORS.GRAY_D3,
    alignSelf: 'stretch',
  },
  lineLeft: {
    marginLeft: 50,
  },
  lineRight: {
    marginRight: 50,
  },
  errorContainer: {
    margin: BASIC_SPACING,
    padding: BASIC_SPACING,
    backgroundColor: COLORS.GRAY_E6,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  hide: {
    display: 'none',
  },
  stakeInfoHeader: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stakeInfoText: {
    paddingBottom: BASIC_SPACING,
    color: COLORS.GRAY_47,
  },
  errorMessage: {
    paddingVertical: BASIC_SPACING,
    color: COLORS.PRIMARY_RED,
  },
  boldText: {
    fontWeight: 'bold',
  },
  errorMessageText: {
    padding: BASIC_SPACING,
    backgroundColor: COLORS.LIGHT_GRAY,
    color: COLORS.GRAY_47,
    marginBottom: BASIC_SPACING,
    borderRadius: 3,
  },
  waitingText: {
    textAlign: 'center',
    paddingVertical: 5,
    color: COLORS.GRAY_47,
  },
  activityIndicator: {
    paddingVertical: 5,
  },
})
