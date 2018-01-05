// @flow
import React, { Component } from 'react'
import { StyleSheet, Alert, TouchableOpacity, View, Modal as RNModal } from 'react-native'
import { compose, gql, graphql } from 'react-apollo'
import QRCodeScanner from 'react-native-qrcode-scanner'

import Modal from '../shared/Modal'
import TextInput from '../shared/TextInput'
import Button from '../shared/Button'
import colors from '../colors'
import Icon from '../shared/Icon'
import Text from '../shared/Text'
import { RequestContactMutation } from '../../data/graphql/mutations'

type Props = {
  requestContact: (id: string) => void,
  onRequestClose: () => void,
}

type State = {
  scanOpen: boolean,
  contactInput: string,
  hasCameraPermission?: boolean,
}

export class AddContactModal extends Component<Props, State> {

  state: State = {
    contactInput: '',
  }

  // HANDLERS

  onPressAddContact = async () => {
    const { contactInput } = this.state
    try {
      await this.props.requestContact(contactInput)
      this.props.onRequestClose()
    } catch (err) {
      Alert.alert(
        'Error Adding Contact',
        'Please check you entered a valid public key',
        [{text: 'OK'}],
      )
    }
  }

  handleQRCodeRead = (data: Object) => {
    this.setState({
      contactInput: data.data,
      scanOpen: false,
    })
  }

  onChangeContactInput = (value: string) => {
    this.setState({
      contactInput: value,
    })
  }

  onPressScanQR = () => {
    this.setState({
      scanOpen: true,
    })
  }

  onCloseScanner = () => {
    this.setState({
      scanOpen: false,
    })
  }

  // RENDER

  renderScanner () {
    return (
      <View style={styles.scannerContainer}>
      {
        <QRCodeScanner
          onRead={this.handleQRCodeRead}
          style={{ height: 250, width: 250 }}
          topViewStyle={styles.scannerTop}
          bottomViewStyle={styles.scannerTop}
          topContent={(
            <TouchableOpacity onPress={this.onCloseScanner} style={styles.scanClose}>
              <Icon name="times-circle" iconSet="awesome" size={30} color={colors.WHITE} />
            </TouchableOpacity>
          )}
        />
      }
      </View>
    )
  }

  renderForm () {
    const { contactInput } = this.state
    return (
      <View>
        <View>
          <TextInput
            onChangeText={this.onChangeContactInput}
            placeholder="Contact public key"
            style={styles.input}
            value={contactInput}
          />
          <TouchableOpacity onPress={this.onPressScanQR} style={styles.scanButton}>
            <Icon name="md-qr-scanner" size={22} color={colors.WHITE} />
          </TouchableOpacity>
        </View>
        <Button
          autoFocus
          style={styles.button}
          disabled={contactInput.length === 0}
          onPress={this.onPressAddContact}
          title="Add contact"
        />
      </View>
    )
  }

  render () {
    const shouldRenderScanner = this.state.scanOpen

    return shouldRenderScanner ? (
      <RNModal
        onRequestClose={this.onCloseScanner}
      >
      	{this.renderScanner()}
      </RNModal>
    ) : (
      <Modal
        title="Add a contact"
        visible={this.props.visible}
        onRequestClose={this.props.onRequestClose}
        >
        {this.renderForm()}
      </Modal>
    )
  }
}

const styles = StyleSheet.create({
  input: {
    marginBottom: 3,
    backgroundColor: colors.LIGHT_GRAY,
    paddingRight: 40,
  },
  button: {
    marginTop: 20,
  },
  scanButton: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: colors.PRIMARY_RED,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  scannerContainer: {
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  scannerTop: {
    flex: 1,
    backgroundColor: colors.BLACK,
  },
  scanClose: {
    position: 'absolute',
    top: 30,
    right: 20,
  },
})

export default compose(
  RequestContactMutation,
)(AddContactModal)
