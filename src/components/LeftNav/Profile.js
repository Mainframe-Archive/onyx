// @flow

import React, { Component } from 'react'
import { compose } from 'react-apollo'
import { View, StyleSheet, TouchableOpacity } from 'react-native-web'
import Text from '../Text'
import Avatar from '../Avatar'
import {
  AcceptContactMutation,
  RequestContactMutation,
  type AcceptContactFunc,
  type RequestContactFunc,
} from '../../graphql/mutations'

import COLORS from '../../colors'
import { BASIC_SPACING } from '../../styles'

type Props = {
  profile: {
    id: string,
    avatar: ?string,
    name: ?string,
  },
  large?: boolean,
  isOpen?: boolean,
  newMessages?: boolean,
  channel?: string,
  state: ?('ACCEPTED' | 'RECEIVED' | 'SENT'),
  showID?: boolean,
  acceptContact: AcceptContactFunc,
  requestContact: RequestContactFunc,
  onOpen: (profile: Object) => void,
}

export class Profile extends Component<Props> {
  static defaultProps = {
    large: false,
    showID: false,
    isOpen: false,
    newMessages: false,
  }

  onOpen = () => {
    if (this.props.onOpen) {
      this.props.onOpen(this.props.profile)
    }
  }

  onPressAccept = () => {
    this.props.acceptContact(this.props.profile.id).then(() => {
      this.onOpen()
    })
  }

  onPressInvite = () => {
    this.props.requestContact(this.props.profile.id)
    this.onOpen()
  }

  renderState() {
    switch (this.props.state) {
      case 'SENT':
        return (
          <View style={styles.stateArea}>
            <Text style={styles.sentText}>Sent</Text>
          </View>
        )
      case 'RECEIVED':
        return this.props.profile.hasStake ? (
          <View style={styles.stateArea}>
            <TouchableOpacity
              onPress={this.onPressAccept}
              style={styles.stateButton}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        ) : (
          null
        )
      case null:
        return (
          <View style={styles.stateArea}>
            <TouchableOpacity
              onPress={this.onPressInvite}
              style={styles.stateButton}
            >
              <Text style={styles.acceptText}>Invite</Text>
            </TouchableOpacity>
          </View>
        )
      default:
        return null
    }
  }

  render() {
    const { profile, large, showID, isOpen, channel, newMessages } = this.props

    const nameStyles = [styles.name]
    if (large) {
      nameStyles.push(styles.large)
    }

    const containerStyles = [styles.container]
    if (isOpen) {
      containerStyles.push(styles.open)
    }

    if (!profile.hasStake && !large) {
      nameStyles.push(styles.fadedText)
    } else if (newMessages) {
      nameStyles.push(styles.redText)
    }

    return (
      <TouchableOpacity onPress={this.onOpen} style={containerStyles}>
        <View style={styles.avatarArea}>
          <Avatar size={large ? 'large' : 'small'} profile={profile} />
        </View>
        <View style={styles.userData}>
          <Text style={nameStyles} numberOfLines={1}>
            {profile.name || profile.id}
          </Text>
          {showID && (
            <Text style={styles.id} numberOfLines={1}>
              {profile.id}
            </Text>
          )}
          {channel && (
            <Text style={styles.channel} numberOfLines={1}>
              {`#${channel}`}
            </Text>
          )}
        </View>
        {this.renderState()}
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: BASIC_SPACING / 2,
  },
  open: {
    backgroundColor: COLORS.SECONDARY_BLUE,
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
  },
  userData: {
    flex: 1,
    overflow: 'hidden',
    marginLeft: BASIC_SPACING,
    paddingRight: 2 * BASIC_SPACING,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  name: {
    color: COLORS.WHITE,
    fontSize: 14,
  },
  redText: {
    color: COLORS.PRIMARY_RED,
    fontWeight: '600',
  },
  fadedText: {
    color: COLORS.TRANSPARENT_WHITE,
  },
  large: {
    fontWeight: '500',
  },
  id: {
    color: COLORS.LIGHT_BLUE,
    fontSize: 12,
    fontWeight: '400',
  },
  channel: {
    color: COLORS.TRANSPARENT_WHITE,
    fontSize: 12,
    fontWeight: '400',
  },
  stateArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingHorizontal: BASIC_SPACING,
    backgroundColor: COLORS.PRIMARY_BLUE,
    boxShadow: `-7px 1px 20px 0px ${COLORS.PRIMARY_BLUE}`,
    height: '100%',
    justifyContent: 'center',
  },
  stateButton: {
    backgroundColor: COLORS.SECONDARY_BLUE,
    paddingHorizontal: BASIC_SPACING * 2,
    paddingVertical: BASIC_SPACING / 2,
    borderRadius: 30,
  },
  acceptText: {
    color: COLORS.TRANSPARENT_WHITE,
  },
  sentText: {
    paddingHorizontal: BASIC_SPACING * 2,
    paddingVertical: BASIC_SPACING / 2,
    color: COLORS.LIGHT_BLUE_TRANSPARENT,
  },
  redBullet: {
    width: 10,
    height: 10,
    borderRadius: 30,
    backgroundColor: COLORS.PRIMARY_RED,
    marginHorizontal: BASIC_SPACING,
  },
})

// $FlowFixMe
export default compose(AcceptContactMutation, RequestContactMutation)(Profile)
