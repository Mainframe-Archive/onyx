// @flow

import React, { Component } from 'react'
import { StyleSheet, View, TouchableOpacity } from 'react-native-web'

import Button from './Form/Button'
import Text from './Text'
import Modal from './Modal'
import Peer from './ChannelSelectPeer'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Profile = {
  id: string,
  avatar: ?string,
  name: ?string,
}

type Contact = {
  profile: Profile,
  state?: string,
}

export type ChannelData = {
  id: string,
  peers: Array<Contact>,
}

type Props = {
  channel: ChannelData,
  profile: Contact,
  mutationError?: string,
  onSelectPeer: (id: string) => void,
  onCloseModal: () => void,
  onPressInviteMore: () => void,
}

export default class ChannelParticipantsModal extends Component<Props, State> {
  onCloseModal = () => {
    this.props.onCloseModal()
  }

  onPressResendInvites = () => {
    this.props.onPressResendInvites()
    this.props.onCloseModal()
  }

  renderPeers = () => {
    const { channel, profile } = this.props

    const participants = [{ profile }, ...channel.peers]
    return (
      <View style={styles.peersList}>
        {participants.map(({ profile, state }) => (
          <Peer
            key={profile.id}
            profile={profile}
            onSelectPeer={this.props.onSelectPeer}
            large
          />
        ))}
      </View>
    )
  }

  render() {
    const { isOpen, mutationError } = this.props
    const errorMessage = mutationError ? (
      <Text style={styles.errorText}>{mutationError}</Text>
    ) : null

    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={this.onCloseModal}
        title="Participants"
        subtitle={`${this.props.channel.peers.length + 1} participants in #${
          this.props.channel.subject
        }`}
      >
        <View style={styles.separator} />
        {errorMessage}

        <TouchableOpacity
          style={styles.resendButton}
          onPress={this.onPressResendInvites}
        >
          <Text style={styles.resendText}>Resend invites</Text>
          <Text style={[styles.resendText, styles.arrowIcon]}>></Text>
        </TouchableOpacity>
        <View style={styles.peersArea}>{this.renderPeers()}</View>
        <Button
          onPress={this.props.onPressInviteMore}
          rightIcon="add"
          title="Invite more people"
        />
      </Modal>
    )
  }
}

const styles = StyleSheet.create({
  peersArea: {
    flexDirection: 'column',
    width: '100%',
    maxWidth: 450,
    paddingVertical: BASIC_SPACING,
    marginBottom: 2 * BASIC_SPACING,
    maxHeight: '40vh',
    overflowY: 'auto',
    flexWrap: 'nowrap',
  },
  resendButton: {
    marginBottom: BASIC_SPACING,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  resendText: {
    color: COLORS.PRIMARY_RED,
    fontSize: 14,
  },
  arrowIcon: {
    fontSize: 20,
    marginLeft: BASIC_SPACING / 2,
  },
  peersList: {
    flexDirection: 'column',
    paddingVertical: BASIC_SPACING,
    flexWrap: 'wrap',
  },
  separator: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.GRAY_E6,
    marginVertical: 2 * BASIC_SPACING,
    width: '100%',
  },
  errorText: {
    fontSize: 13,
    padding: BASIC_SPACING,
    color: COLORS.PRIMARY_RED,
  },
})
