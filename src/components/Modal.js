// @flow

import React, { type Node, Component } from 'react'
import ReactModal from 'react-modal'
import { View, TouchableOpacity, StyleSheet } from 'react-native-web'

import Text from './Text'
import ColoredLine from './ColoredLine'
import Icon from './Icon'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {
  title: string,
  subtitle?: string,
  children?: Node,
  onRequestClose: () => void,
  isOpen: boolean,
  dark?: boolean,
}

export default class Modal extends Component<Props> {
  static defaultProps = {
    isOpen: false,
  }

  render() {
    const {
      children,
      title,
      subtitle,
      onRequestClose,
      isOpen,
      dark,
    } = this.props

    const darkStyle = dark ? styles.dark : styles.light
    const titleStyle = dark ? [styles.title, styles.whiteText] : styles.title
    const containerStyles = [styles.container, darkStyle]

    const closeButton = onRequestClose ? (
      <TouchableOpacity style={styles.closeIcon} onPress={onRequestClose}>
        <Icon name="red-close" />
      </TouchableOpacity>
    ) : null

    return (
      <ReactModal isOpen={isOpen} onRequestClose={onRequestClose}>
        <View style={containerStyles}>
          <View style={styles.header}>
            <Text style={titleStyle}>{title}</Text>
            <ColoredLine />
            {closeButton}
          </View>
          {subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
          <View style={styles.content}>{children}</View>
        </View>
      </ReactModal>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 520,
  },
  light: {
    backgroundColor: COLORS.WHITE,
  },
  dark: {
    backgroundColor: COLORS.DARKEST_BLUE,
  },
  header: {
    minWidth: 480,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 3 * BASIC_SPACING,
    paddingTop: 3 * BASIC_SPACING,
  },
  title: {
    fontSize: 18,
    color: COLORS.PRIMARY_BLUE,
    fontWeight: '600',
    paddingVertical: BASIC_SPACING,
  },
  closeIcon: {
    marginLeft: 2 * BASIC_SPACING,
  },
  modalSubtitle: {
    paddingHorizontal: 3 * BASIC_SPACING,
    paddingBottom: BASIC_SPACING,
    fontSize: 12,
    color: COLORS.LIGHTEST_BLUE,
  },
  content: {
    paddingHorizontal: 3 * BASIC_SPACING,
    paddingBottom: 4 * BASIC_SPACING,
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 100px)',
  },
  whiteText: {
    color: COLORS.WHITE,
  },
})
