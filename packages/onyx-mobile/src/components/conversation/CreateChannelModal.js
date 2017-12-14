// @flow

import React, { Component } from 'react'
import {
  StyleSheet,
  Switch,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions
} from 'react-native'
import { compose } from 'react-apollo'

import TextInput from '../shared/TextInput'
import Button from '../shared/Button'
import Text from '../shared/Text'
import Avatar from '../shared/Avatar'
import Modal from '../shared/Modal'
import Icon from '../shared/Icon'

import {
  CreateChannelMutation,
  type CreateChannelFunc
} from '../../data/graphql/mutations'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Profile = {
  id: string,
  avatar: ?string,
  name: ?string,
}

type PeerProps = {
  profile: Profile,
  state: string,
  selected: boolean,
  onSelectPeer: (id: string) => void,
}

const Peer = ({ profile, state, selected, onSelectPeer }: PeerProps) => {
  const onSelect = () => {
    onSelectPeer(profile.id)
  }

  const name = profile.name || profile.id
  const disabled = state !== 'ACCEPTED'
  const peerStyle = [styles.peer]
  const nameStyle = [styles.peerName]
  if (selected) {
    peerStyle.push(styles.peerSelected)
    nameStyle.push(styles.peerNameSelected)
  }

  return (
    <TouchableOpacity style={peerStyle} onPress={onSelect} disabled={disabled}>
      <Avatar profile={profile} size={36} />
      <Text numberOfLines={1} style={nameStyle}>
        {name}
      </Text>
      {selected && <Icon iconSet="material" name="check-circle" size={30} color={COLORS.WHITE}/>}
    </TouchableOpacity>
  )
}

export type ChannelData = {
  dark: boolean,
  peers: Array<string>,
  subject: string,
}

type Props = {
  contacts: Array<{
    profile: Profile,
    state: string,
  }>,
  isOpen: boolean,
  onRequestClose: () => void,
  onChannelCreated: () => void,
  createChannel: CreateChannelFunc,
}

type State = {
  darkInput: boolean,
  selectedPeers: Set<string>,
  subjectInput: string,
}

export class CreateChannelModal extends Component<Props, State> {
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
    this.props.onRequestClose()
  }

  onPressCreateChannel = async () => {
    const { darkInput, selectedPeers, subjectInput } = this.state
    this.setState({
      requesting: true,
    })

    try {
      const { data } = await this.props.createChannel({
        dark: darkInput,
        subject: subjectInput,
        peers: Array.from(selectedPeers),
      })
      this.setState({ requesting: false })
      this.props.onChannelCreated(data.createChannel.id)
    } catch (err) {
      Alert.alert(
        `Error Creating Channel`,
        `Sorry, there was a problem creating your new channel`,
        [{text: 'OK'}],
      )
      this.setState({ requesting: false })
    }
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
    const dims = Dimensions.get('window')
    const scrollStyle = { maxHeight: dims.height / 3 }
    return (
      <ScrollView style={scrollStyle} contentContainerStyle={styles.peersList}>
        {contacts.map(({ profile, state }) => (
          <Peer
            key={profile.id}
            profile={profile}
            state={state}
            selected={selectedPeers.has(profile.id)}
            onSelectPeer={this.toggleSelectedPeer}
          />
        ))}
      </ScrollView>
    )
  }

  render() {
    const { isOpen } = this.props
    const { darkInput, selectedPeers, subjectInput } = this.state

    const darkTextStyles = [styles.iconText]
    const darkIconColor = darkInput ? COLORS.PRIMARY_RED : COLORS.MEDIUM_GRAY
    const directTextStyles = [styles.iconText]
    const directIconColor = darkInput ? COLORS.MEDIUM_GRAY : COLORS.PRIMARY_RED
    const titleStyles = [styles.modalTitle]

    if (darkInput) {
      darkTextStyles.push(styles.redText)
      titleStyles.push(styles.whiteText)
    } else {
      directTextStyles.push(styles.redText)
    }

    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={this.onCloseModal}
        title="Add a new channel"
        darkStyle={darkInput}
      >
        <TextInput
          placeholder="Channel subject"
          returnKeyType="done"
          value={subjectInput}
          style={styles.input}
          onChangeText={this.onChangeSubjectInput}
        />
        <View style={styles.peersArea}>
          <Text style={titleStyles}>Add peers</Text>
          <Text style={styles.modalSubtitle}>
            Only accepted contacts can be added
          </Text>
          {this.renderPeers()}
        </View>
        <View style={styles.privacyLevel}>
          <Text style={titleStyles}>Privacy Level </Text>
          <View style={styles.privacySwitch}>
            <TouchableOpacity onPress={this.setDirect} style={styles.icon}>
              <Icon iconSet="entypo" size={30} color={directIconColor} name={"flash"} />
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
              <Icon iconSet="entypo" size={30} color={darkIconColor} name={"mask"} />
            </TouchableOpacity>
          </View>
        </View>
        {
          this.state.requesting ? (
            <ActivityIndicator />
          ) : (
            <Button
              disabled={selectedPeers.size === 0 || subjectInput.length === 0}
              onPress={this.onPressCreateChannel}
              title="Create channel"
            />
          )
        }
      </Modal>
    )
  }
}

const styles = StyleSheet.create({
  peersArea: {
    flexDirection: 'column',
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
  input: {
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  peersList: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: BASIC_SPACING,
  },
  peer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: BASIC_SPACING / 2,
    borderRadius: 50,
    marginBottom: BASIC_SPACING / 2,
  },
  peerSelected: {
    backgroundColor: COLORS.LIGHTEST_BLUE,
    paddingRight: BASIC_SPACING,
  },
  peerName: {
    flex: 1,
    marginLeft: BASIC_SPACING,
    color: COLORS.MEDIUM_GRAY,
    fontSize: 15,
  },
  peerNameSelected: {
    color: COLORS.WHITE,
  },
  privacyLevel: {
    marginBottom: BASIC_SPACING / 2,
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
})

export default compose(
  CreateChannelMutation,
)(CreateChannelModal)
