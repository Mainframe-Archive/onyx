// @flow

import React from 'react'
import { StyleSheet, View } from 'react-native-web'

import Icon from './Icon'
import Text from './Text'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

export const FOOTER_SIZE = 70

type Props = {
  footer: ?boolean,
}

export default ({ footer }: Props) => {
  const containerStyles = footer
    ? [styles.container, styles.footer]
    : styles.container
  return (
    <View style={containerStyles}>
      <Text style={styles.poweredText}>Powered by </Text>
      <Icon name="mainframe-logo" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.DARK_BLUE,
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 2 * BASIC_SPACING,
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    width: '100%',
  },
  poweredText: {
    color: COLORS.WHITE,
    fontSize: 9,
  },
})
