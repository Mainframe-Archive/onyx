// @flow

import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'

import Text from './Text'
import Avatar from './Avatar'
import Icon from './Icon'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {
  profile: Profile,
  selected: boolean,
  disabled?: boolean,
  large?: boolean,
  onSelectPeer: (id: string) => void,
}

const ChannelSelectPeer = ({
  profile,
  state,
  selected,
  disabled,
  onSelectPeer,
  large,
}: Props) => {
  const onSelect = () => {
    onSelectPeer(profile.id)
  }

  const name = profile.name || profile.id
  const peerStyle = [styles.peer]
  const nameStyle = [styles.peerName]
  if (selected) {
    peerStyle.push(styles.peerSelected)
    nameStyle.push(styles.peerNameSelected)
  } else if (disabled) {
    peerStyle.push(styles.peerDisabled)
  }

  if (large) {
    peerStyle.push(styles.peerLarge)
  }

  return (
    <TouchableOpacity style={peerStyle} onPress={onSelect} disabled={disabled}>
      <Avatar profile={profile} />
      <Text numberOfLines={1} style={nameStyle}>
        {name}
      </Text>
      {selected && <Icon name="checkmark" />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  peer: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: BASIC_SPACING / 2,
    borderRadius: 50,
  },
  peerLarge: {
    width: 'auto',
  },
  peerSelected: {
    backgroundColor: COLORS.LIGHTEST_BLUE,
    paddingRight: 2 * BASIC_SPACING,
  },
  peerDisabled: {
    opacity: 0.5,
  },
  peerName: {
    flex: 1,
    maxWidth: 200,
    marginLeft: BASIC_SPACING,
    color: COLORS.MEDIUM_GRAY,
    fontSize: 14,
  },
  peerNameSelected: {
    color: COLORS.WHITE,
  },
})

export default ChannelSelectPeer
