// @flow

import React, { type Node, Component } from 'react'
import { Text as RNText, StyleSheet } from 'react-native-web'

type Props = {
  style?: number | Array<boolean | number> | Object,
  children?: Node,
}

export default class Text extends Component<Props> {
  render() {
    const { children, style, ...other } = this.props
    return (
      <RNText style={[styles.font, style]} {...other}>
        {children}
      </RNText>
    )
  }
}

const styles = StyleSheet.create({
  font: {
    fontFamily: 'Poppins',
  },
})
