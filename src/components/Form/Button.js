// @flow

import React, { Component } from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native-web'
import Text from '../Text'

import COLORS from '../../colors'
import { BASIC_SPACING } from '../../styles'

type Props = {
  title: string,
  disabled?: boolean,
  onPress?: Function,
}

export default class Button extends Component<Props> {
  render() {
    const { disabled, onPress, title } = this.props

    const containerStyles = [styles.container]

    if (disabled) {
      containerStyles.push(styles.disabledContainer)
    }

    return (
      <TouchableOpacity
        disabled={disabled}
        onPress={onPress}
        style={containerStyles}
      >
        <Text style={styles.text}>{title}</Text>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.PRIMARY_RED,
    borderRadius: 30,
    flex: 1,
    marginVertical: BASIC_SPACING,
    paddingHorizontal: BASIC_SPACING * 3,
  },
  disabledContainer: {
    backgroundColor: COLORS.LIGHTEST_RED,
  },
  text: {
    flex: 1,
    fontSize: 18,
    color: COLORS.WHITE,
    paddingVertical: 1.5 * BASIC_SPACING,
    textAlign: 'center',
  },
})
