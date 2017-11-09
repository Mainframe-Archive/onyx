// @flow

import React, { Component } from 'react'
import { StyleSheet, View } from 'react-native-web'

import TextInput from './Form/TextInput'
import Button from './Form/Button'
import Avatar from './Avatar'
import Modal from './Modal'

import { BASIC_SPACING } from '../styles'

type Props = {
  isOpen: boolean,
  onCloseModal: () => void,
  onPressAddContact: (data: ChannelData) => void,
}

type State = {
  contactInput: string,
}

export default class AddContactModal extends Component<Props, State> {
  state = {
    contactInput: '',
  }

  resetState = () => {
    this.setState({
      contactInput: '',
    })
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
      return s.contactInput === contactInput ? null : { contactInput }
    })
  }

  render() {
    const { isOpen } = this.props
    const { contactInput } = this.state

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
        {!!contactInput && (
          <View style={styles.blocky}>
            <Avatar size="x-large" blocky profile={{ id: contactInput }} />
          </View>
        )}
        <Button
          disabled={contactInput.length === 0}
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
})
