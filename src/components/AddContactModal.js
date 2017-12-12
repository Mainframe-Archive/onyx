// @flow

import React, { Component } from 'react'
import { StyleSheet, View } from 'react-native-web'

import TextInput from './Form/TextInput'
import Button from './Form/Button'
import Avatar from './Avatar'
import Modal from './Modal'
import Text from './Text'

import { BASIC_SPACING } from '../styles'
import COLORS from '../colors'

const PUB_KEY_VALIDATION = /0x[0-9a-f]{130}/
const ERRORS = {
  INVALID_KEY: 'This is not a valid public key.',
  YOU: 'Are you trying to add yourself as a contact?',
}

type Props = {
  isOpen: boolean,
  onCloseModal: () => void,
  onPressAddContact: (data: ChannelData) => void,
  viewerId: string,
}

type State = {
  contactInput: string,
  errorMessage: string,
  validKey: boolean,
}

export default class AddContactModal extends Component<Props, State> {
  state = {
    contactInput: '',
    errorMessage: ERRORS.INVALID_KEY,
  }

  resetState = () => {
    this.setState({
      contactInput: '',
      errorMessage: ERRORS.INVALID_KEY,
    })
  }

  getErrorMessage(contactInput: string) {
    if (!contactInput.length || !PUB_KEY_VALIDATION.test(contactInput)) {
      return ERRORS.INVALID_KEY
    }

    if (contactInput === this.props.viewerId) {
      return ERRORS.YOU
    }

    return ''
  }

  onCloseModal = () => {
    this.resetState()
    this.props.onCloseModal()
  }

  onPressAddContact = () => {
    const { contactInput } = this.state
    this.resetState()
    this.props.onPressAddContact(contactInput)
  }

  onChangeContactInput = (contactInput: string) => {
    this.setState((s: State) => {
      return s.contactInput === contactInput
        ? null
        : {
            contactInput,
            errorMessage: this.getErrorMessage(contactInput),
          }
    })
  }

  render() {
    const { isOpen } = this.props
    const { contactInput, errorMessage } = this.state

    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={this.onCloseModal}
        title="Add a contact"
      >
        <TextInput
          onChangeText={this.onChangeContactInput}
          placeholder="Contact public key"
          value={contactInput}
        />
        {contactInput.length > 0 && (
          <View>
            {errorMessage.length > 0 && (
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            )}
            {errorMessage !== ERRORS.INVALID_KEY && (
              <View style={styles.blocky}>
                <Avatar size="x-large" blocky profile={{ id: contactInput }} />
              </View>
            )}
          </View>
        )}
        <Button
          disabled={!!errorMessage}
          onPress={this.onPressAddContact}
          title="Add contact"
        />
      </Modal>
    )
  }
}

const styles = StyleSheet.create({
  blocky: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: BASIC_SPACING,
  },
  errorMessage: {
    textAlign: 'left',
    color: COLORS.PRIMARY_RED,
    marginBottom: BASIC_SPACING,
    marginLeft: BASIC_SPACING,
  },
})
