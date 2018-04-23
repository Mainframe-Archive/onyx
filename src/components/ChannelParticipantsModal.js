// @flow

import React, { Component } from 'react'
import { StyleSheet, View } from 'react-native-web'

import type { InviteMoreInput } from '../graphql/mutations'

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
  state: string,
}

export type ChannelData = {
  id: string,
  peers: Array<Contact>,
}

type Props = {
  channel: ChannelData,
  contacts: Array<Contact>,
  mutationError?: string,
  onCloseModal: () => void,
  onPressInviteMore: (input: InviteMoreInput) => void,
}

type State = {
  disabledPeers: Set<string>,
  selectedPeers: Set<string>,
}

export default class ChannelParticipantsModal extends Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      disabledPeers: new Set(props.channel.peers.map(p => p.profile.id)),
      selectedPeers: new Set(),
    }
  }

  resetState = () => {
    this.setState({
      selectedPeers: new Set(),
    })
  }

  onCloseModal = () => {
    this.resetState()
    this.props.onCloseModal()
  }

  onPressInviteMore = () => {
    const { selectedPeers } = this.state
    this.resetState()
    this.props.onPressInviteMore({
      id: this.props.channel.id,
      peers: Array.from(selectedPeers),
    })
    this.props.onCloseModal()
  }

  onPressResendInvites = () => {
    this.props.onPressResendInvites()
    this.props.onCloseModal()
  }

  toggleSelectedPeer = (id: string) => {
    this.setState((s: State) => {
      const selectedPeers = s.selectedPeers
      if (selectedPeers.has(id)) {
        selectedPeers.delete(id)
      } else {
        selectedPeers.add(id)
      }
      return { selectedPeers }
    })
  }

  renderPeers = () => {
    const { contacts } = this.props
    const { disabledPeers, selectedPeers } = this.state

    return (
      <View style={styles.peersList}>
        {contacts
          .filter(({ state }) => state === 'ACCEPTED')
          .map(({ profile, state }) => (
            <Peer
              key={profile.id}
              profile={profile}
              disabled={disabledPeers.has(profile.id)}
              selected={selectedPeers.has(profile.id)}
              onSelectPeer={this.toggleSelectedPeer}
            />
          ))}
      </View>
    )
  }

  render() {
    const { isOpen, mutationError } = this.props
    const { selectedPeers } = this.state

    const errorMessage = mutationError ? (
      <Text style={styles.errorText}>{mutationError}</Text>
    ) : null

    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={this.onCloseModal}
        title="Add contacts to this channel">
        {errorMessage}
        <View style={styles.peersArea}>{this.renderPeers()}</View>
        {selectedPeers.size === 0 ? (
          <Button onPress={this.onPressResendInvites} title="Resend Invites" />
        ) : (
          <Button onPress={this.onPressInviteMore} title="Invite Contacts" />
        )}
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
  },
  modalTitle: {
    fontSize: 16,
    color: COLORS.PRIMARY_BLUE,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.LIGHTEST_BLUE,
  },
  peersList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: BASIC_SPACING,
    flexWrap: 'wrap',
  },
  icon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconText: {
    marginHorizontal: BASIC_SPACING,
    color: COLORS.MEDIUM_GRAY,
    fontSize: 20,
  },
  redText: {
    color: COLORS.PRIMARY_RED,
  },
  whiteText: {
    color: COLORS.WHITE,
  },
  errorContainer: {
    margin: BASIC_SPACING,
    padding: BASIC_SPACING,
    backgroundColor: COLORS.GRAY_E6,
  },
  errorText: {
    fontSize: 13,
    padding: BASIC_SPACING,
    color: COLORS.PRIMARY_RED,
  },
})
