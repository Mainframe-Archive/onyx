// @flow

import React, { Component } from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import Text from './Text'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {
  title: string,
  disabled: boolean,
  style: number | Object | Array<number | Object>,
  onPress?: Function,
}

export default class Button extends Component<Props> {
  render() {
    const { disabled, onPress, title, style } = this.props

    const containerStyles = [styles.container]

    if (style) {
      containerStyles.push(style)
    }

    if (disabled) {
      containerStyles.push(styles.disabledContainer)
    }

    return (
      <TouchableOpacity
        disabled={disabled}
        onPress={onPress}
        style={containerStyles}
      >
        <Text fontStyle="semi-bold" style={styles.text}>{title}</Text>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.PRIMARY_RED,
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledContainer: {
    backgroundColor: COLORS.LIGHTEST_RED,
  },
  text: {
    paddingTop: 12,
    alignSelf: 'center',
    flex: 1,
    fontSize: 16,
    color: COLORS.WHITE,
    textAlign: 'center',
  },
})
