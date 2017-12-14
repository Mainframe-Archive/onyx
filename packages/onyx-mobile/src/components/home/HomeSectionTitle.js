// @flow

import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import Text from '../shared/Text'

import Icon from '../shared/Icon'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {
  onPressPlus?: ?() => void,
  title: string,
}

export default class SectionTitle extends Component<Props> {
  renderPlus() {
    const { onPressPlus } = this.props

    return onPressPlus ? (
      <TouchableOpacity onPress={onPressPlus} style={styles.plus}>
        <Icon name="md-add" size={32} color={COLORS.TRANSPARENT_WHITE}/>
      </TouchableOpacity>
    ) : null
  }

  render() {
    const { title } = this.props

    return (
      <View style={styles.container}>
        <Text style={styles.title} numberOfLines={1} fontStyle="semi-bold">
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
    marginBottom: BASIC_SPACING / 2,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 16,
  },
  plus: {
    position: 'absolute',
    top: -5,
    right: 5,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 40,
    height: 35,
  },
})
