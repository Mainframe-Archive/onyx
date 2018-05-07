// @flow

import React, { Component } from 'react'
import { StyleSheet, Switch, View, TouchableOpacity } from 'react-native-web'

import TextInput from './Form/TextInput'
import Button from './Form/Button'
import Text from './Text'
import Modal from './Modal'
import Icon from './Icon'
import Peer from './ChannelSelectPeer'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Profile = {
  id: string,
  avatar: ?string,
  name: ?string,
}

export type CreateChannelData = {
  dark: boolean,
  peers: Array<string>,
  subject: string,
}

type Props = {
  contacts: Array<{
    profile: Profile,
    state: string,
  }>,
  mutationError?: string,
  isOpen: boolean,
  onCloseModal: () => void,
  onPressCreateChannel: (data: ChannelData) => void,
}

type State = {
  darkInput: boolean,
  selectedPeers: Set<string>,
  subjectInput: string,
}

export default class CreateChannelModal extends Component<Props, State> {
  state = {
    darkInput: false,
    // $FlowFixMe
    selectedPeers: new Set(),
    subjectInput: '',
  }

  resetState = () => {
    this.setState({
      darkInput: false,
      selectedPeers: new Set(),
      subjectInput: '',
    })
  }

  onCloseModal = () => {
    this.resetState()
    this.props.onCloseModal()
  }

  onPressCreateChannel = () => {
    const { darkInput, selectedPeers, subjectInput } = this.state
    this.resetState()
    this.props.onPressCreateChannel({
      dark: darkInput,
      subject: subjectInput,
      peers: Array.from(selectedPeers),
    })
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

  onChangeSubjectInput = (subjectInput: string) => {
    this.setState((s: State) => {
      return s.subjectInput === subjectInput ? null : { subjectInput }
    })
  }

  onChangeDarkInput = (darkInput: boolean) => {
    this.setState((s: State) => {
      return s.darkInput === darkInput ? null : { darkInput }
    })
  }

  setDark = () => {
    this.setState({
      darkInput: true,
    })
  }

  setDirect = () => {
    this.setState({
      darkInput: false,
    })
  }

  renderPeers = () => {
    const { contacts } = this.props
    const { selectedPeers } = this.state

    return (
      <View style={styles.peersList}>
        {contacts
          .filter(({ state }) => state === 'ACCEPTED')
          .map(({ profile, state }) => (
            <Peer
              key={profile.id}
              profile={profile}
              selected={selectedPeers.has(profile.id)}
              onSelectPeer={this.toggleSelectedPeer}
            />
          ))}
      </View>
    )
  }

  render() {
    const { isOpen, mutationError } = this.props
    const { darkInput, selectedPeers, subjectInput } = this.state

    const darkTextStyles = [styles.iconText]
    const darkIcon = darkInput ? 'mask-red' : 'mask-gray'

    const directTextStyles = [styles.iconText]
    const directIcon = darkInput ? 'flash-gray' : 'flash-red'

    const titleStyles = [styles.modalTitle]

    if (darkInput) {
      darkTextStyles.push(styles.redText)
      titleStyles.push(styles.whiteText)
    } else {
      directTextStyles.push(styles.redText)
    }

    const errorMessage = mutationError ? (
      <Text style={styles.errorText}>{mutationError}</Text>
    ) : null

    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={this.onCloseModal}
        title="Add a new channel"
        dark={darkInput}>
        {errorMessage}
        <TextInput
          onChangeText={this.onChangeSubjectInput}
          placeholder="Channel subject"
          value={subjectInput}
        />
        <View style={styles.peersArea}>
          <Text style={titleStyles}>Add peers</Text>
          {this.renderPeers()}
        </View>
        <View style={styles.privacyLevel}>
          <Text style={titleStyles}>Privacy Level </Text>
          <View style={styles.privacySwitch}>
            <TouchableOpacity onPress={this.setDirect} style={styles.icon}>
              <Icon name={directIcon} />
              <Text style={directTextStyles}>Direct</Text>
            </TouchableOpacity>
            <Switch
              thumbColor={COLORS.PRIMARY_RED}
              activeThumbColor={COLORS.PRIMARY_RED}
              trackColor={COLORS.GRAY_E6}
              activeTrackColor={COLORS.GRAY_E6}
              onValueChange={this.onChangeDarkInput}
              value={darkInput}
            />
            <TouchableOpacity onPress={this.setDark} style={styles.icon}>
              <Text style={darkTextStyles}>Dark</Text>
              <Icon name={darkIcon} />
            </TouchableOpacity>
          </View>
        </View>
        <Button
          disabled={selectedPeers.size === 0 || subjectInput.length === 0}
          onPress={this.onPressCreateChannel}
          title="Create channel"
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
  privacyLevel: {
    marginBottom: BASIC_SPACING,
  },
  privacySwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: BASIC_SPACING,
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
