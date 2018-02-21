// @flow
import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native-web'
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

const stakeAddress = '0x7e16016df8c3d0a944cf568309b4214ab9856bee'
const tokenAddress = '0xb070079e7d689f96940155c5003587ecafd633d6'

type Props = {
  address: ?string,
  defaultLocalhostUrl: string,
  storedServerUrl: string,
  connectionError: string,
}

type State = {
  url: ?string,
  loadingLocal: boolean,
  loadingRemote: boolean,
  showCertsSelectModal?: boolean,
  stakeStep: number,
  whitelistAddress: ?string,
}

export default class NodeConnectionView extends Component<Props, State> {

  constructor(props: Props) {
    super(props)
    const showStakingModal = props.connectionError.startsWith('You need to stake')
    this.state = {
      url: props.storedServerUrl,
      loadingLocal: false,
      loadingRemote: false,
      stakeStep: 1,
      whitelistAddress: props.address,
      showStakingModal,
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
    const transactionData = '0x095ea7b30000000000000000000000007e16016df8c3d0a944cf568309b4214ab9856bee0000000000000000000000000000000000000000000000000de0b6b3a7640000'
    const url = `https://www.myetherwallet.com/?to=${tokenAddress}&value=0&gaslimit=100000&data=${transactionData}#send-transaction`
    shell.openExternal(url)
    this.setState({
      stakeStep: 2,
    })
  }

  onChangeWhitelistAddress = (value) => {
    this.setState({
      whitelistAddress: value,
    })
  }

  onPressDepositAndWhitelist = () => {
    const { whitelistAddress } = this.state
    if (
      whitelistAddress.substring(0, 2) === '0x' &&
      whitelistAddress.length === 42
    ) {
      this.setState({
        showWhitelistError: false,
      })
      const trimmedAddress = whitelistAddress.substring(2, 42)
      const transactionData = `0x959752980000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000${trimmedAddress}`
      const url = `https://www.myetherwallet.com/?to=${stakeAddress}&value=0&gaslimit=200000&data=${transactionData}#send-transaction`
      shell.openExternal(url)
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

  renderStakeRequiredModal() {
    const showWhitelistError = this.state.showWhitelistError ? (
      <Text style={styles.errorMessage}>
        * Invalid ETH address
      </Text>
    ) : null
    const step1 = (
      <View>
        <Text style={styles.stakeInfoText}>
          To participate in the Mainframe network you are required to stake
          one Mainframe token (1 MFT) to our staking contract.
          This requires two transactions, one to approve the deposit and a second
          to make the deposit and whitelist your ETH address
        </Text>
        <Text style={styles.stakeInfoHeader}>
          Step 1
        </Text>
        <Text style={styles.stakeInfoText}>
          Approve our staking contract to take your deposit
        </Text>
        <Button
          title="Step 1 - Approve Deposit of 1 MFT"
          onPress={this.onPressApproveDeposit}
        />
      </View>
    )
    const step2 = (
      <View>
        <Text style={styles.stakeInfoText}>
          <Text style={styles.boldText}>IMPORTANT:</Text> Only continue with step 2 once the transaction from step 1 has been successfully mined,
          you can check the state of the transaction from the tx hash provided by MyEtherWallet
        </Text>
        <Text style={styles.stakeInfoHeader}>
          Step 2
        </Text>
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
          title="Step 2 - Deposit 1 MFT and Whitelist"
          onPress={this.onPressDepositAndWhitelist}
        />
      </View>
    )
    return (
      <Modal
        onRequestClose={this.onRequestCloseStake}
        title="Stake Mainframe Token"
        isOpen={this.state.showStakingModal}
      >
        {this.state.stakeStep === 1 ? step1 : step2}
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
})
