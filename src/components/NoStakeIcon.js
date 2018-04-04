// @flow

import React, { Component } from 'react'
import { View, StyleSheet } from 'react-native-web'
import Text from './Text'
import COLORS from '../colors'

export default class NoStakeIcon extends Component {
  render () {
    return (
      <View style={styles.exclamationContainer}>
        <Text>!</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  exclamationContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.PRIMARY_RED,
    color: COLORS.WHITE,
    alignItems: 'center',
    fontWeight: 900,
  },
})
