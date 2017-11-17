// @flow

import React, { Component } from 'react'
import { Image, View, StyleSheet } from 'react-native-web'
import Blockies from 'react-blockies'

type Props = {
  profile: {
    id: string,
    avatar: ?string,
  },
  size: 'small' | 'large' | 'x-large' | 'xx-large',
  blocky?: boolean,
}

export const AVATAR_SIZE = {
  'xx-large': 160,
  'x-large': 80,
  large: 48,
  small: 32,
}

export default class Avatar extends Component<Props> {
  static defaultProps = {
    size: 'small',
  }

  render() {
    const { profile, size, blocky } = this.props
    const avatarSize = AVATAR_SIZE[size]
    return blocky || profile.avatar == null ? (
      <View style={styles.container}>
        <Blockies
          seed={profile.id}
          size={8}
          scale={Math.ceil(avatarSize / 8)}
        />
      </View>
    ) : (
      <View style={styles.container}>
        <Image
          resizeMode="cover"
          source={{
            uri: profile.avatar,
            width: avatarSize,
            height: avatarSize,
          }}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: '50%',
  },
})
