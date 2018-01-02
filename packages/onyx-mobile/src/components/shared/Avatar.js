// @flow
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { Image, View, StyleSheet } from 'react-native'
import Blockies from 'react-native-blockies'

type Props = {
  profile: {
    id: string,
    avatar: ?string,
  },
  large: boolean,
  size: number,
}

const AVATAR_SIZE = {
  large: 60,
  small: 40,
}

export default class Avatar extends Component<Props> {
  static contextTypes = {
    httpServerUrl: PropTypes.string.isRequired,
  }
  static defaultProps = {
    size: AVATAR_SIZE.small,
  }

  render() {
    const { profile, large, size } = this.props
    const containerStyles = [styles.container]
    const sizeStyle = {
      width: size,
      height: size,
      borderRadius: size / 2,
    }
    containerStyles.push(sizeStyle)
    return profile.avatar == null ? (
      <View style={containerStyles}>
        <Blockies blockies={profile.id} style={{ width: size, height: size }} size={size} />
      </View>
    ) : (
      <View style={sizeStyle}>
        <Image
          style={containerStyles}
          resizeMode="cover"
          source={{
            uri: `${this.context.httpServerUrl}/bzzr:/${profile.avatar}`,
            width: size,
            height: size,
          }}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
})
