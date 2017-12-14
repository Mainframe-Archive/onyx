// @flow

import React, { Component } from 'react'
import { compose } from 'react-apollo'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import Text from '../shared/Text'
import Avatar from '../shared/Avatar'
import {
  AcceptContactMutation,
  type AcceptContactFunc,
} from '../../data/graphql/mutations'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Profile = {
  id: string,
  avatar: ?string,
  name: ?string,
}

type Props = {
  profile: Profile,
  large: boolean,
  isOpen: boolean,
  newMessages: boolean,
  state: 'ACCEPTED' | 'RECEIVED' | 'SENT',
  acceptContact: AcceptContactFunc,
  onOpenProfile?: (profile: Profile) => void,
  onOpenDM?:(id: string) => void,
}

export class HomeContactView extends Component<Props> {
  static defaultProps = {
    large: false,
    showID: false,
    isOpen: false,
    newMessages: false,
  }

  onOpen = () => {
    if (this.props.onOpenProfile) {
      this.props.onOpenProfile(this.props.profile)
    } else if (this.props.onOpenDM && this.props.convoId) {
      this.props.onOpenDM(this.props.convoId)
    }
  }

  onPressAccept = async () => {
    try {
      const { data } = await this.props.acceptContact(this.props.profile.id)
      this.props.onOpenDM(data.acceptContact.convoID)
    } catch (err) {
      console.warn(err)
    }
  }

  renderBullet() {
    return this.props.newMessages ? <View style={styles.redBullet} /> : null
  }

  renderState() {
    const stateAreaStyle = [styles.stateArea]
    if (this.props.isOpen) {
      stateAreaStyle.push(styles.stateAreaOpen)
    }
    switch (this.props.state) {
      case 'SENT':
        return (
          <View style={stateAreaStyle}>
            <Text style={styles.sentText}>Sent</Text>
          </View>
        )
      case 'RECEIVED':
        return (
          <View style={stateAreaStyle}>
            <TouchableOpacity
              onPress={this.onPressAccept}
              style={styles.stateButton}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )
      default:
        return null
    }
  }

  render() {
    const { profile, large, showID, isOpen, newMessages } = this.props

    const nameStyles = [styles.name]

    if (newMessages) {
      nameStyles.push(styles.redText)
    }

    const containerStyles = [styles.container]
    if (isOpen) {
      containerStyles.push(styles.open)
    }
    if (large) {
      containerStyles.push(styles.largeContainer)
      nameStyles.push(styles.largeName)
    }

    return (
      <TouchableOpacity onPress={this.onOpen} style={containerStyles}>
        <View style={styles.avatarArea}>
          <Avatar size={large ? 60 : 40} profile={profile} />
        </View>
        <View style={styles.userData}>
          <Text fontStyle={large ? 'semi-bold' : 'regular'} style={nameStyles} numberOfLines={1}>
            {profile.name || profile.id}
          </Text>
          {showID && (
            <Text style={styles.id} numberOfLines={1}>
              {profile.id}
            </Text>
          )}
        </View>
        {this.renderBullet()}
        {this.renderState()}
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: BASIC_SPACING * 0.25,
    marginBottom: BASIC_SPACING / 2,
  },
  largeContainer: {
    padding: BASIC_SPACING,
    paddingBottom: 0,
  },
  open: {
    backgroundColor: COLORS.SECONDARY_BLUE,
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
  },
  userData: {
    marginLeft: BASIC_SPACING,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingRight: BASIC_SPACING / 2,
    flex: 1,
  },
  name: {
    color: COLORS.WHITE,
    fontSize: 16,
  },
  largeName: {
    fontSize: 19,
  },
  redText: {
    color: COLORS.PRIMARY_RED,
  },
  id: {
    paddingTop: 2,
    color: COLORS.LIGHT_BLUE,
    fontSize: 14,
  },
  stateArea: {
    paddingHorizontal: BASIC_SPACING,
    backgroundColor: COLORS.PRIMARY_BLUE,
    justifyContent: 'center',
  },
  stateAreaOpen: {
    backgroundColor: COLORS.SECONDARY_BLUE,
  },
  stateButton: {
    backgroundColor: COLORS.SECONDARY_BLUE,
    paddingHorizontal: BASIC_SPACING,
    paddingVertical: BASIC_SPACING / 2,
    borderRadius: 30,
  },
  acceptText: {
    color: COLORS.TRANSPARENT_WHITE,
  },
  sentText: {
    paddingHorizontal: BASIC_SPACING / 2,
    paddingVertical: BASIC_SPACING / 2,
    color: COLORS.LIGHT_BLUE_TRANSPARENT,
    fontSize: 15,
  },
  redBullet: {
    width: 10,
    height: 10,
    borderRadius: 30,
    backgroundColor: COLORS.PRIMARY_RED,
    marginHorizontal: BASIC_SPACING,
  },
})

export default compose(AcceptContactMutation)(HomeContactView)
