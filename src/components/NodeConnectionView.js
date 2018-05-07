// @flow

import createContracts from 'onyx-contracts'
import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native-web'
import abi from 'web3-eth-abi'

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
    }
    if (stakeRequired) {
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
      this.setState({
        stakeAddress,
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
    const url = `https://www.mycrypto.com/?to=${
      this.state.tokenAddress
    }&value=0&gaslimit=100000&data=${encodedApproveCall}#send-transaction`
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

  onPressDepositAndWhitelist = () => {
    const { whitelistAddress, requiredStake } = this.state
    if (
      whitelistAddress.substring(0, 2) === '0x' &&
      whitelistAddress.length === 42
    ) {
      this.setState({
        showWhitelistError: false,
      })
      const encodedWhitelistCall = abi.encodeFunctionCall(
        {
          name: 'depositAndWhitelist',
          type: 'function',
          inputs: [
            {
              type: 'uint256',
              name: '_value',
            },
            {
              type: 'address',
              name: 'whitelistAddress',
            },
          ],
        },
        [requiredStake, whitelistAddress],
      )
      const url = `https://www.mycrypto.com/?to=${
        this.state.stakeAddress
      }&value=0&gaslimit=200000&data=${encodedWhitelistCall}#send-transaction`
      shell.openExternal(url)
      this.setState({
        stakeStep: 3,
      })
    } else {
      this.setState({
        showWhitelistError: true,
      })
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
    const step1Button = this.state.stakeAddress ? (
      <Button
        title="Step 1 - Approve deposit of 1 MFT"
        onPress={this.onPressApproveDeposit}
      />
    ) : null
    const step1 = (
      <View>
        <Text style={styles.stakeInfoText}>
          To participate in the Mainframe network you are required to stake one
          Mainframe token (1 MFT) to our staking contract. This requires two
          transactions, one to approve the deposit and a second to make the
          deposit and whitelist your ETH address.
        </Text>
        <Text style={styles.stakeInfoHeader}>Step 1</Text>
        <Text style={styles.stakeInfoText}>
          Approve our staking contract to take your deposit. You will need at
          least 1 MFT in your wallet and a small amount of ETH to cover
          transaction fees.
        </Text>
        {step1Button}
      </View>
    )
    const step2 = (
      <View>
        <Text style={styles.stakeInfoText}>
          <Text style={styles.boldText}>IMPORTANT:</Text> Only continue with
          step 2 once the transaction from step 1 has been successfully mined,
          you can check the state of the transaction from the tx hash provided
          by MyCrypto.
        </Text>
        <Text style={styles.stakeInfoHeader}>Step 2</Text>
        <Text style={styles.stakeInfoText}>
          Whitelist the ETH address of the node you would like to stake for
        </Text>
        {showWhitelistError}
        <TextInput
          value={this.state.whitelistAddress}
          placeholder="whitelist address"
          onChangeText={this.onChangeWhitelistAddress}
        />
        <Button
          title="Step 2 - Deposit 1 MFT and whitelist node"
          onPress={this.onPressDepositAndWhitelist}
        />
      </View>
    )
    const step3 = (
      <View>
        <Text style={styles.stakeInfoText}>
          Once the final transaction has been successfully mined, your node
          address should have a stake associated with it and will enable you to
          participate in the Mainframe network.
        </Text>
        <Button title="Restart local node" onPress={this.onPressFinishStake} />
      </View>
    )
    const steps = [step1, step2, step3]
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
})
