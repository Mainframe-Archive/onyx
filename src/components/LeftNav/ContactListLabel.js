// @flow

import React, { Component } from 'react'
import { View, StyleSheet } from 'react-native-web'
import Text from '../Text'

import COLORS from '../../colors'
import { BASIC_SPACING } from '../../styles'

type Props = {
  title: string,
}

export default class ContactListLabel extends Component<Props> {
  render() {
    const { title } = this.props

    return (
      <View style={styles.container}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.line} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: BASIC_SPACING / 2,
    marginVertical: BASIC_SPACING / 2,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.WHITE,
    marginLeft: BASIC_SPACING / 2,
  },
})
