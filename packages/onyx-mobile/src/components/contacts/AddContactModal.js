// @flow
import React, { Component } from 'react'
import { StyleSheet, Alert, TouchableOpacity, View } from 'react-native'
import { compose, gql, graphql } from 'react-apollo'
// import { BarCodeScanner, Permissions } from 'expo'

import Modal from '../shared/Modal'
import TextInput from '../shared/TextInput'
import Button from '../shared/Button'
import colors from '../colors'
import Icon from '../shared/Icon'
import { RequestContactMutation } from '../../data/graphql/mutations'

type Props = {
  requestContact: (id: string) => void,
  onRequestClose: () => void,
}

type State = {
  contactInput: string,
  hasCameraPermission?: boolean,
}

export class AddContactModal extends Component<Props, State> {

  state: State = {
    contactInput: '',
  }

  componentDidMount () {
    this.requestCameraPermission()
  }

  // HANDLERS

  requestCameraPermission = async () => {
    // const { status } = await Permissions.askAsync(Permissions.CAMERA)
    // this.setState({
    //   hasCameraPermission: status === 'granted',
    // })
  }

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

  handleQRCodeRead = (data) => {
    this.setState({
      contactInput: data.data,
      scanOpen: false,
    })
  }

  onChangeContactInput = (value) => {
    this.setState({
      contactInput: value,
    })
  }

  onPressScanQR = () => {
    this.setState({
      scanOpen: true,
    })
  }

  // RENDER

  renderScanner () {
    return (
      <View style={styles.scannerContainer}>
      {
        // <BarCodeScanner
        //   onBarCodeRead={this.handleQRCodeRead}
        //   style={{ height: 250, width: 250 }}
        // />
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
    const shouldRenderScanner = this.state.scanOpen && this.state.hasCameraPermission
    if (this.state.scanOpen && !this.state.hasCameraPermission) {
      this.requestCameraPermission()
    }
    return(
      <Modal
        title="Add a contact"
        visible={this.props.visible}
        onRequestClose={this.props.onRequestClose}
        >
        {shouldRenderScanner ? this.renderScanner() : this.renderForm()}
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
  },
})

export default compose(
  RequestContactMutation,
)(AddContactModal)
