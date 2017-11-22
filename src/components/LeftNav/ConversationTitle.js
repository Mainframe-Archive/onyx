// @flow

import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native-web'
import Text from '../Text'

import COLORS from '../../colors'
import { BASIC_SPACING } from '../../styles'

type Props = {
  conversation: {
    id: string,
    subject: string,
  },
  isOpen: boolean,
  newMessages: boolean,
  onOpen: (id: string) => void,
}

export default class ConverationTitle extends Component<Props> {
  static defaultProps = {
    isOpen: false,
    newMessages: false,
  }

  onOpen = () => {
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
    if (isOpen) {
      containerStyles.push(styles.open)
    }

    const nameStyles = [styles.name]
    if (newMessages) {
      nameStyles.push(styles.redText)
    }

    return (
      <TouchableOpacity onPress={this.onOpen} style={containerStyles}>
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
    marginBottom: BASIC_SPACING / 2,
  },
  open: {
    backgroundColor: COLORS.LIGHT_BLUE,
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
  },
  convoSubject: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    color: COLORS.WHITE,
    fontSize: 14,
    maxWidth: 160,
  },
  redText: {
    color: COLORS.PRIMARY_RED,
    fontWeight: '600',
  },
  id: {
    overflow: 'hidden',
    whiteSpace: 'no-wrap',
    textOverflow: 'elipsis',
    color: COLORS.LIGHT_BLUE,
    fontSize: 12,
    fontWeight: '400',
  },
  redBullet: {
    width: 10,
    height: 10,
    borderRadius: 30,
    backgroundColor: COLORS.PRIMARY_RED,
    marginHorizontal: BASIC_SPACING,
  },
})
