// @flow

import React, { Component } from 'react'
import { View, StyleSheet } from 'react-native-web'
import Text from './Text'
import Button from './Form/Button'
import Modal from './Modal'
import { BASIC_SPACING } from '../styles'

const shell = window.require('electron').shell

type Props = {
  onError?: () => void,
  onDismiss?: () => void,
}

type State = {
  open: boolean,
  update: {
    title?: string,
    url?: string,
    description?: string,
    button?: string,
  },
}

const CURRENT_VERSION = '0.4.2'
const VERSION_URL = 'https://mainframe.com/onyx-version.json'

export default class UpdateModal extends Component<Props, State> {
  state: State = {
    open: false,
    update: {
      title: 'New version',
      description: 'A new version of Onyx was released',
      button: 'Download',
    },
  }

  componentDidMount() {
    fetch(VERSION_URL)
      .then(response => {
        if (response.ok) {
          return response.json()
        } else {
          this.props.onError && this.props.onError()
        }
      })
      .then(data => {
        if (data.version && data.version > CURRENT_VERSION) {
          this.setState({
            open: true,
            update: data,
          })
        } else {
          this.props.onDismiss && this.props.onDismiss()
        }
      })
      .catch(error => {
        this.props.onError && this.props.onError()
      })
  }

  closeModal = () => {
    this.setState({ open: false })
    this.props.onDismiss && this.props.onDismiss()
  }

  onPress = () => {
    shell.openExternal(this.state.update.url)
  }

  render() {
    return (
      <Modal
        isOpen={this.state.open}
        onRequestClose={this.closeModal}
        title={this.state.update.title}
      >
        <View style={styles.description}>
          <Text>{this.state.update.description}</Text>
        </View>
        <Button
          onPress={this.onPress}
          style={styles.button}
          title={this.state.update.button}
        />
      </Modal>
    )
  }
}

const styles = StyleSheet.create({
  button: {
    marginTop: 4 * BASIC_SPACING,
  },
  description: {
    marginTop: 3 * BASIC_SPACING,
  },
})
