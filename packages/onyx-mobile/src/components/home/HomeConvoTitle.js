// @flow

import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import Text from '../shared/Text'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {
  conversation: {
    subject: string,
  },
  isOpen: boolean,
  newMessages: boolean,
  onOpen: (id: string) => void,
}

export default class HomeConvoTitle extends Component<Props> {
  static defaultProps = {
    isOpen: false,
    newMessages: false,
  }

  onPress = () => {
    if (this.props.onOpen) {
      this.props.onOpen(this.props.conversation.id)
    }
  }

  renderBullet() {
    return this.props.newMessages ? <View style={styles.redBullet} /> : null
  }

  render() {
    const { conversation, isOpen, newMessages } = this.props

    const containerStyles = [styles.container]
    const nameStyles = [styles.name]
    if (isOpen) {
      containerStyles.push(styles.open)
    }

    if (newMessages) {
      nameStyles.push(styles.redText)
    }

    return (
      <TouchableOpacity onPress={this.onPress} style={containerStyles}>
        <View style={styles.convoSubject}>
          <Text style={nameStyles} numberOfLines={1}>
            {`# ${conversation.subject}`}
          </Text>
          {this.renderBullet()}
        </View>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: BASIC_SPACING / 2,
  },
  open: {
    backgroundColor: COLORS.LIGHT_BLUE,
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
  },
  convoSubject: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: COLORS.WHITE,
    fontSize: 16,
    flex: 1,
  },
  redText: {
    color: COLORS.PRIMARY_RED,
  },
  redBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY_RED,
    marginHorizontal: BASIC_SPACING / 2,
  },
})
