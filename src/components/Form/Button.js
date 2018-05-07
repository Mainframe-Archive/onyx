// @flow

import React, { Component } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native-web'
import Text from '../Text'
import Icon from '../Icon'

import COLORS from '../../colors'
import { BASIC_SPACING, INPUT_HEIGHT } from '../../styles'

type Props = {
  title: string,
  disabled?: boolean,
  outlineStyle?: boolean,
  style?: number | Array<number | Object> | Object,
  textStyle?: number | Array<number | Object> | Object,
  rightIcon?: string,
  onPress?: Function,
}

export default class Button extends Component<Props> {
  render() {
    const {
      disabled,
      onPress,
      title,
      outlineStyle,
      style,
      textStyle,
      rightIcon,
    } = this.props

    const containerStyles = [styles.container]
    const textStyles = [styles.text]

    if (outlineStyle) {
      containerStyles.push(styles.outlineContainer)
      textStyles.push(styles.redText)
    }

    if (disabled) {
      containerStyles.push(styles.disabledContainer)
    }

    if (style) {
      containerStyles.push(style)
    }

    if (textStyle) {
      textStyles.push(textStyle)
    }

    return (
      <TouchableOpacity
        disabled={disabled}
        onPress={onPress}
        style={containerStyles}
      >
        <View style={styles.textArea}>
          <Text style={textStyles}>{title}</Text>
        </View>

        {rightIcon && (
          <View style={styles.iconArea}>
            <Icon name={rightIcon} />
          </View>
        )}
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    height: INPUT_HEIGHT,
    backgroundColor: COLORS.PRIMARY_RED,
    borderRadius: INPUT_HEIGHT / 2,
    flex: 1,
    marginVertical: BASIC_SPACING,
    paddingHorizontal: BASIC_SPACING * 3,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    flex: 1,
  },
  outlineContainer: {
    borderWidth: 2,
    borderColor: COLORS.PRIMARY_RED,
    backgroundColor: 'rgba(0,0,0,0)',
    height: INPUT_HEIGHT + 4,
    borderRadius: (INPUT_HEIGHT + 3) / 2,
  },
  disabledContainer: {
    backgroundColor: COLORS.LIGHTEST_RED,
  },
  text: {
    fontSize: 18,
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  redText: {
    color: COLORS.PRIMARY_RED,
  },
})
