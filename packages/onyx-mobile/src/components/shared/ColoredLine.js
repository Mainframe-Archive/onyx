// @flow

import React, { Component } from 'react'
import { View, StyleSheet } from 'react-native'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {}

export default class ColoredLine extends Component<Props> {
  render() {
    return (
      <View style={styles.container}>
        <View style={[styles.line, styles.blueLine]} />
        <View style={[styles.line, styles.darkBlueLine]} />
        <View style={[styles.line, styles.redLine]} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY_BLUE,
    height: 2,
  },
  line: {
    height: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  blueLine: {
    backgroundColor: COLORS.LIGHTEST_BLUE,
    width: '100%',
  },
  darkBlueLine: {
    backgroundColor: COLORS.PRIMARY_BLUE,
    width: '40%',
  },
  redLine: {
    backgroundColor: COLORS.PRIMARY_RED,
    width: '20%',
  },
})
