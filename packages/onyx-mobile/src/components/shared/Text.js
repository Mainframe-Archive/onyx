// @flow

import React, { type Node, Component } from 'react'
import { Text as RNText, StyleSheet } from 'react-native'

type Props = {
  style?: number | Array<number> | Object,
  children?: Node,
  fontStyle?: string,
}

export default class Text extends Component<Props> {
  render() {
    const { children, fontStyle, style, ...other } = this.props
    const textStyles = []
    switch (fontStyle) {
      case 'semi-bold':
        textStyles.push(styles.fontSemiBold)
        break
      case 'bold':
        textStyles.push(styles.fontBold)
        break
      default:
        textStyles.push(styles.fontReg)
    }
    textStyles.push(style)
    return (
      <RNText style={textStyles} {...other}>
        {children}
      </RNText>
    )
  }
}

const styles = StyleSheet.create({
  fontReg: {
    fontFamily: 'Poppins-Regular',
  },
  fontSemiBold: {
    fontFamily: 'Poppins-SemiBold',
  },
  fontBold: {
    fontFamily: 'Poppins-Bold',
  },
})
