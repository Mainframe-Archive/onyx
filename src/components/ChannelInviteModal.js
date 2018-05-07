// @flow

import React, { Component } from 'react'
import { StyleSheet, View, TouchableOpacity } from 'react-native-web'

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

export default class ChannelInviteModal extends Component<Props, State> {
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
        title="Invite more people"
        subtitle={`#${this.props.channel.subject}`}
      >
        {errorMessage}
        <Text style={styles.instructionsText}>
          Select one or multiple people below
        </Text>
        <View style={styles.peersArea}>{this.renderPeers()}</View>
        <TouchableOpacity onPress={this.onCloseModal}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Button
          disabled={selectedPeers.size === 0}
          onPress={this.onPressInviteMore}
          title="Confirm invitations"
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
  },
  peersList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: BASIC_SPACING,
    flexWrap: 'wrap',
  },
  instructionsText: {
    color: COLORS.PRIMARY_BLUE,
    marginVertical: BASIC_SPACING,
    fontSize: 12,
  },
  cancelText: {
    color: COLORS.PRIMARY_RED,
    textAlign: 'center',
    marginVertical: BASIC_SPACING,
    fontSize: 12,
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
