// @flow

import React, { type Node, Component } from 'react'
import { View, TouchableOpacity, StyleSheet, Modal as RNModal, Dimensions } from 'react-native'

import Text from './Text'
import ColoredLine from './ColoredLine'
import Icon from './Icon'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {
  title: string,
  children?: Node,
  visible?: boolean,
  darkStyle?: boolean,
  onRequestClose: () => void,
}

export default class Modal extends Component<Props> {
  static defaultProps = {
    isOpen: false,
  }

  render() {
    const { children, title, onRequestClose, visible, darkStyle } = this.props
    const dims = Dimensions.get('window')
    const containerStyles = [styles.container, {maxHeight: dims.height - (BASIC_SPACING * 2)}]
    const titleStyles = [styles.title]
    if (darkStyle) {
      containerStyles.push(styles.darkBg)
      titleStyles.push(styles.whiteText)
    }
    return (
      <RNModal
        visible={visible}
        onRequestClose={onRequestClose}
        transparent
        >
        <View style={styles.backgroundContainer}>
          <View style={containerStyles}>
            <View style={styles.header}>
              <Text style={titleStyles} numberOfLines={1} fontStyle="bold">{title}</Text>
              <View style={styles.line}>
                <ColoredLine />
              </View>
              <TouchableOpacity style={styles.closeIcon} onPress={onRequestClose}>
                <Icon name="md-close" size={30} color={COLORS.PRIMARY_RED}/>
              </TouchableOpacity>
            </View>
            <View style={styles.content}>{children}</View>
          </View>
        </View>
      </RNModal>
    )
  }
}

const styles = StyleSheet.create({
  backgroundContainer: {
    backgroundColor: COLORS.TRANSPARENT_BLUE,
    flex: 1,
  },
  darkBg: {
    backgroundColor: COLORS.DARK_THEME_BG,
  },
  whiteText: {
    color: COLORS.WHITE,
  },
  container: {
    margin: BASIC_SPACING,
    backgroundColor: COLORS.WHITE,
    padding: BASIC_SPACING,
    borderRadius: 8,
    marginTop: BASIC_SPACING * 2
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: BASIC_SPACING / 2,
  },
  line: {
    flex: 1,
    height: 2,
  },
  title: {
    fontSize: 18,
    color: COLORS.SECONDARY_BLUE,
    flexShrink: 1,
    marginRight: BASIC_SPACING,
  },
  closeIcon: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    paddingTop: BASIC_SPACING,
  },
})
