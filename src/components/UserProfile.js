// @flow

import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native-web'
import QRCode from 'qrcode.react'

import Text from './Text'
import Avatar from './Avatar'
import Icon from './Icon'
import Button from './Form/Button'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {
  profile: {
    id: string,
    avatar: ?string,
    name: ?string,
    bio?: ?string,
  },
  serverURL?: ?string,
  keyQRCode?: boolean,
  hideTitle?: boolean,
  canEdit?: boolean,
  onPressEdit: () => void,
}

type State = {
  connectedQROpen: boolean,
}

export default class UserProfile extends Component<Props, State> {
  state = {
    connectedQROpen: false,
  }

  toggleQR = () => {
    this.setState({
      connectedQROpen: !this.state.connectedQROpen,
    })
  }

  render() {
    const { profile, serverURL, keyQRCode, hideTitle, canEdit } = this.props

    const { connectedQROpen } = this.state

    if (profile == null) {
      return null
    }

    const editButton = canEdit ? (
      <Button title="Edit my profile" onPress={this.props.onPressEdit} />
    ) : null
    const noStakeText = '* This user has no stake'
    const noStakeMessage = !profile.hasStake ? (
      <Text style={styles.noStakeMessage}>{noStakeText}</Text>
    ) : null

    const title = profile.name || profile.id.substr(0, 8)
    return (
      <View style={styles.container}>
        <View style={styles.userProfile}>
          {!hideTitle && <Text style={styles.title}>{title}</Text>}
          <View style={styles.avatarArea}>
            <Avatar size="xx-large" profile={profile} blockyOver="large" hideStakeIndicator />
          </View>
          {!!profile.bio && (
            <View style={styles.userData}>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          )}
          {noStakeMessage}
          {editButton}
        </View>
        {!connectedQROpen && (
          <View>
            <View style={styles.separator} />
            <View style={styles.qrArea}>
              {keyQRCode ? (
                <View style={styles.qrCode}>
                  <QRCode value={profile.id} />
                </View>
              ) : profile.avatar ? (
                <View style={styles.qrCode}>
                  <Avatar size="x-large" hideStakeIndicator profile={profile} blocky />
                </View>
              ) : null}
              <View>
                <Text style={styles.idTitle}>Public Key:</Text>
                <Text style={styles.id}>{profile.id}</Text>
              </View>
            </View>
          </View>
        )}
        {serverURL && (
          <View>
            <View style={styles.separator} />
            <Text style={styles.idTitle}>Connected on:</Text>
            <Text style={styles.id}>{serverURL}</Text>
            {!connectedQROpen ? (
              <TouchableOpacity
                onPress={this.toggleQR}
                style={styles.showQrButton}
              >
                <Icon name="see-qr" />
                <Text style={styles.showQrButtonText}>See QR code</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={this.toggleQR}
                style={styles.showQrButton}
              >
                <Icon name="circled-cross" />
                <Text style={styles.showQrButtonText}>Hide QR code</Text>
              </TouchableOpacity>
            )}
            {connectedQROpen && (
              <View style={styles.qrCodeCenter}>
                <QRCode value={serverURL} />
              </View>
            )}
          </View>
        )}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    paddingHorizontal: BASIC_SPACING / 2,
    marginBottom: BASIC_SPACING / 2,
  },
  title: {
    fontSize: 18,
    color: COLORS.PRIMARY_BLUE,
    fontWeight: '600',
    padding: BASIC_SPACING,
  },
  userProfile: {
    flexDirection: 'column',
    width: '100%',
    paddingHorizontal: BASIC_SPACING,
    alignItems: 'center',
  },
  userData: {
    maxWidth: 500,
    paddingVertical: 2 * BASIC_SPACING,
  },
  bio: {
    width: '100%',
    textAlign: 'center',
    color: COLORS.SECONDARY_BLUE,
    fontSize: 14,
  },
  separator: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.GRAY_E6,
    marginVertical: 2 * BASIC_SPACING,
    width: '100%',
  },
  qrArea: {
    flexDirection: 'row',
  },
  idTitle: {
    color: COLORS.PRIMARY_BLUE,
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: BASIC_SPACING,
  },
  id: {
    color: COLORS.GRAY_23,
    fontSize: 14,
    fontWeight: '400',
    maxWidth: 300,
    paddingHorizontal: BASIC_SPACING,
  },
  qrCode: {
    padding: BASIC_SPACING,
  },
  qrCodeCenter: {
    alignSelf: 'center',
    margin: 2 * BASIC_SPACING,
  },
  showQrButton: {
    margin: BASIC_SPACING,
    flexDirection: 'row',
    alignItems: 'center',
  },
  showQrButtonText: {
    marginLeft: BASIC_SPACING,
    color: COLORS.PRIMARY_RED,
  },
  noStakeMessage: {
    textAlign: 'center',
    color: COLORS.PRIMARY_RED,
    fontSize: 13,
  },
})
