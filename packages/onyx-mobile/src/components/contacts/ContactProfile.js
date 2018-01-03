// @flow
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import QRCode from 'react-native-qrcode'

import Modal from '../shared/Modal'
import Text from '../shared/Text'
import Avatar from '../shared/Avatar'
import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {
  title: ?string,
  isMe: boolean,
  profile: Object,
  onRequestClose: () => void,
}

export default class ContactProfile extends Component<Props> {
  static contextTypes = {
    logout: PropTypes.func.isRequired,
  }

  logout = () => {
    this.context.logout()
  }

  render() {
    const { title, profile, isMe } = this.props
    const logout = isMe ? (
      <TouchableOpacity onPress={this.logout} style={styles.logout}>
        <Text style={styles.logoutText} fontStyle={'semi-bold'}>Logout</Text>
      </TouchableOpacity>
    ) : null
    return (
      <Modal
        title={title || profile.name || 'Contact'}
        onRequestClose={this.props.onRequestClose}>
        <View style={styles.container}>
          <Avatar size={140} profile={profile} />
          {logout}
          <View style={styles.bottom}>
            <View style={styles.codeContainer}>
              <QRCode
                value={profile.id}
                size={150}
                bgColor='black'
                fgColor='white'/>
            </View>
            <Text style={styles.idLabel}>{profile.id}</Text>
          </View>
        </View>
      </Modal>
    )
  }
}

const BUTTON_SIZE = 36

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  idLabel: {
    marginTop: BASIC_SPACING,
  },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: COLORS.GRAY_E6,
    paddingTop: BASIC_SPACING,
    marginTop: BASIC_SPACING,
  },
  codeContainer: {
    alignItems: 'center',
  },
  logout: {
    borderRadius: BUTTON_SIZE / 2,
    height: BUTTON_SIZE,
    backgroundColor: COLORS.LIGHT_GRAY,
    justifyContent: 'center',
    paddingHorizontal: BUTTON_SIZE,
    marginVertical: BASIC_SPACING,
  },
  logoutText: {
    color: COLORS.PRIMARY_RED,
  },
})
