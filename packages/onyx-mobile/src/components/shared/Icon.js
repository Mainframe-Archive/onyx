// @flow
import React, { Component } from 'react'
import FontAwesome from 'react-native-vector-icons/FontAwesome'
import Ionicons from 'react-native-vector-icons/Ionicons'
import Entypo from 'react-native-vector-icons/Entypo'
import Zocial from 'react-native-vector-icons/Zocial'

type Props = {
  iconSet?: string,
  name: string,
  size: number,
  color: string,
}

export default class Icon extends Component<Props> {
  render() {
    switch (this.props.iconSet) {
      case 'entypo':
        return <Entypo {...this.props} />
      case 'zocial':
        return <Zocial {...this.props} />
      case 'awesome':
        return <FontAwesome {...this.props} />
      default:
        return <Ionicons {...this.props} />
    }
  }
}
