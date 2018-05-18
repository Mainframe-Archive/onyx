// @flow

import createContracts from 'onyx-contracts'
import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native-web'
import abi from 'web3-eth-abi'
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
  ethAddress: ?string,
  whitelistAddress: ?string,
  ensError?: string,
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
      ethAddress: '',
    }
    if (stakeRequired) {
      this.resolveEns()
    }
  }

  resolveEns = async () => {
    const { ethNetwork } = this.props
    const contracts = createContracts(ethNetwork)
    try {
      const [requiredStake, stakingContractAddress, tokenAddress] = await Promise.all([
        contracts.getRequiredStake(),
        contracts.ens.resolveName(ENS_NAMES.stake[ethNetwork]),
        contracts.ens.resolveName(ENS_NAMES.token[ethNetwork]),
      ])
      this.setState({
        stakingContractAddress,
        tokenAddress,
        requiredStake,
        ensError: null,
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

  onPressApproveDeposit = () => {
    const {
      stakingContractAddress,
      requiredStake,
      whitelistAddress,
      ethAddress,
    } = this.state

    if (!web3Utils.isAddress(whitelistAddress)) {
      this.setState({showWhitelistError: true})
      return
    } else if (!web3Utils.isAddress(ethAddress)) {
      this.setState({showEthAddressError: true})
      return
    }

    const encodedStakeCall = abi.encodeFunctionCall(
      {
        inputs: [
          {
            name: 'staker',
            type: 'address',
          },
          {
            name: 'whitelistAddress',
            type: 'address',
          },
        ],
        name: 'stake',
      },
      [ethAddress, whitelistAddress],
    )
    const encodedApproveCall = abi.encodeFunctionCall(
      {
        inputs: [
          {
            name: 'spender',
            type: 'address',
          },
          {
            name: 'value',
            type: 'uint256',
          },
          {
            name: 'data',
            type: 'bytes',
          }
        ],
        name: 'approveAndCall',
        type: 'function',
      },
      [stakingContractAddress, requiredStake, encodedStakeCall],
    )
    const url = `https://legacy.mycrypto.com/?to=${
      this.state.tokenAddress
    }&value=0&gaslimit=200000&data=${encodedApproveCall}#send-transaction`
    shell.openExternal(url)
    this.setState({
      stakeStep: 2,
    })
  }

  onChangeWhitelistAddress = value => {
    this.setState({
      whitelistAddress: value,
    })
  }

  onChangeEthAddress = value => {
    this.setState({
      ethAddress: value,
    })
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

  onPressEtherscan = () => {
    shell.openExternal(`http://etherscan.com/address/${this.state.ethAddress}`)
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
    const { requiredStake } = this.state
    if (this.state.ensError) {
      return this.renderEnsError()
    }
    const stakeAmount = requiredStake ? web3Utils.fromWei(this.state.requiredStake, 'ether') : 0
    const showWhitelistError = this.state.showWhitelistError ? (
      <Text style={styles.errorMessage}>* Invalid address</Text>
    ) : null
    const showEthAddressError = this.state.showEthAddressError ? (
      <Text style={styles.errorMessage}>* Invalid address</Text>
    ) : null
    const step1Button = this.state.stakingContractAddress ? (
      <Button
        title={`Stake ${stakeAmount} MFT`}
        onPress={this.onPressApproveDeposit}
      />
    ) : null
    const networkMessage = 'This is a testnet version, ensure you switch to the Ropsten network on MyCrypto'
    const switchNetworkMessage = this.props.ethNetwork === 'TESTNET'
    ? <Text style={styles.importantMessage}>{networkMessage}</Text>
    : null

    const infoText = `To participate in the Mainframe network you are required to stake ${stakeAmount} MFT to our\
 staking contract. You will need at least ${stakeAmount} MFT in your wallet and a small amount of ETH to cover\
 transaction fees. You will be able to withdraw your stake at any time.`

   const finishText = `Once you've completed the transaction on MyCrypto and it has been successfully mined, your node\
 address should have a stake associated with it and will enable you to\
 participate in the Mainframe network. You can check the transaction state via`
    const step1 = (
      <View>
        <Text style={styles.stakeInfoText}>
          {infoText}
        </Text>
        <Text style={styles.stakeInfoHeader}>ETH Address</Text>
        <Text style={styles.stakeInfoText}>
          Please enter the ETH address holding MFT you wish to stake from.
        </Text>
        {showEthAddressError}
        <TextInput
          value={this.state.ethAddress}
          placeholder="ETH address"
          onChangeText={this.onChangeEthAddress}
        />
        <Text style={styles.stakeInfoHeader}>Node Address</Text>
        <Text style={styles.stakeInfoText}>
          Please edit the node address below if you wish to stake
          for a different node.
        </Text>
        {showWhitelistError}
        <TextInput
          value={this.state.whitelistAddress}
          placeholder="whitelist address"
          onChangeText={this.onChangeWhitelistAddress}
        />
        {switchNetworkMessage}
        {step1Button}
      </View>
    )
    const step2 = (
      <View>
        <Text style={styles.stakeInfoText}>
          {finishText}
          <TouchableOpacity onPress={this.onPressEtherscan}>
            <Text style={styles.link}>etherscan.</Text>
          </TouchableOpacity>
        </Text>
        <Button title="Restart local node" onPress={this.onPressFinishStake} />
      </View>
    )
    const steps = [step1, step2]
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
  importantMessage: {
    color: COLORS.PRIMARY_RED,
    fontSize: 16,
    textAlign: 'center',
    padding: 5,
  },
  link: {
    color: COLORS.PRIMARY_RED,
  },
})
