// @flow

import React, { Component } from 'react'
import { Image, View, StyleSheet } from 'react-native-web'
import Blockies from 'react-blockies'
import PropTypes from 'prop-types'

type AvatarSize = 'small' | 'large' | 'x-large' | 'xx-large'
type Props = {
  profile: {
    id: string,
    avatar: ?string, // Swarm Hash
  },
  size: AvatarSize,
  blocky?: boolean,
  blockyOver?: AvatarSize,
}

type State = {
  error: boolean,
}

export const AVATAR_SIZE = {
  'xx-large': 160,
  'x-large': 80,
  large: 48,
  small: 32,
}

export default class Avatar extends Component<Props, State> {
  state = {
    error: false,
  }

  static contextTypes = {
    httpServerUrl: PropTypes.string.isRequired,
  }

  static defaultProps = {
    size: 'small',
  }

  setError = () => {
    this.setState({
      error: true,
    })
  }

  render() {
    const { profile, size, blocky, blockyOver } = this.props
    const { error } = this.state
    const avatarSize = AVATAR_SIZE[size]
    const containerStyles = [styles.container]
    containerStyles.push({ width: avatarSize, height: avatarSize })
    return blocky || profile.avatar == null || error ? (
      <View style={containerStyles}>
        <Blockies
          seed={profile.id}
          size={8}
          scale={Math.ceil(avatarSize / 8)}
        />
      </View>
    ) : (
      <View>
        <View style={containerStyles}>
          <Image
            resizeMode="cover"
            onError={this.setError}
            source={{
              uri: `${this.context.httpServerUrl}/files/${profile.avatar}`,
              width: avatarSize,
              height: avatarSize,
            }}
          />
        </View>
        {!!blockyOver && (
          <View style={[styles.container, styles.blockyOver]}>
            <Blockies
              seed={profile.id}
              size={8}
              scale={Math.ceil(AVATAR_SIZE[blockyOver] / 8)}
            />
          </View>
        )}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: '50%',
    position: 'relative',
  },
  blockyOver: {
    position: 'absolute',
    right: -10,
    bottom: 10,
  },
})
