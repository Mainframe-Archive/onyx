// @flow

import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native-web'
import Text from '../Text'

import Icon from '../Icon'

import COLORS from '../../colors'
import { BASIC_SPACING } from '../../styles'

type Props = {
  onPressPlus?: ?() => void,
  title: string,
}

export default class SectionTitle extends Component<Props> {
  renderPlus() {
    const { onPressPlus } = this.props

    return onPressPlus ? (
      <TouchableOpacity onPress={onPressPlus} style={styles.plus}>
        <Icon name="plus" />
      </TouchableOpacity>
    ) : null
  }

  render() {
    const { title } = this.props

    return (
      <View style={styles.container}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {this.renderPlus()}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: BASIC_SPACING + 2,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '500',
  },
  plus: {
    marginHorizontal: BASIC_SPACING + 4,
  },
})
