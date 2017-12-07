// @flow

import React, { Component } from 'react'
import { Image, View, StyleSheet } from 'react-native-web'
import Blockies from 'react-blockies'
import PropTypes from 'prop-types'

type Props = {
  profile: {
    id: string,
    avatar: ?string, // Swarm Hash
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
  static contextTypes = {
    httpServerUrl: PropTypes.string.isRequired,
  }
  static defaultProps = {
    size: 'small',
  }

  render() {
    const { profile, size, blocky } = this.props
    const avatarSize = AVATAR_SIZE[size]
    const containerStyles = [styles.container]
    containerStyles.push({width: avatarSize, height: avatarSize})
    return blocky || profile.avatar == null ? (
      <View style={containerStyles}>
        <Blockies
          seed={profile.id}
          size={8}
          scale={Math.ceil(avatarSize / 8)}
        />
      </View>
    ) : (
      <View style={containerStyles}>
        <Image
          resizeMode="cover"
          source={{
            uri: `${this.context.httpServerUrl}/files/${profile.avatar}`,
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
