// @flow
import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native-web'
import { onSetServerUrl } from '../data/Electron'

import Icon from './Icon'
import Text from './Text'
import TextInput from './Form/TextInput'
import Button from './Form/Button'
import MainframeBar, { FOOTER_SIZE } from './MainframeBar'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {
  defaultLocalhostUrl: string,
  storedServerUrl: string,
  connectionError: string,
}

type State = {
  url: ?string,
}

export default class NodeConnectionView extends Component {
  state: State = {
    url: '',
  }

  constructor(props) {
    super(props)
    this.state = {
      url: props.storedServerUrl,
    }
  }

  onChangeUrl = (value: string) => {
    this.setState({
      url: value,
    })
  }

  onPressConnect = () => {
    const { url } = this.state
    if (this.state.url && this.state.url.length) {
      onSetServerUrl(this.state.url)
    }
  }

  onPressConnectDefault = () => {
    onSetServerUrl('local')
  }

  render() {
    const connectionErrorMessage = this.props.connectionError ? (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{this.props.connectionError}</Text>
      </View>
    ) : null

    return (
      <View style={styles.container}>
        {connectionErrorMessage}
        <View style={styles.innerContainer}>
          <View style={styles.icon}>
            <Icon name="mainframe-icon" />
          </View>
          <TouchableOpacity
            onPress={this.onPressConnectDefault}
            style={styles.defaultNodeButton}
          >
            <View style={styles.buttonText}>
              <Text style={styles.defaultNodeButtonTitle}>
                Connect on localhost
              </Text>
              <Text style={styles.defaultNodeButtonSubtitle}>
                {this.props.defaultLocalhostUrl}
              </Text>
            </View>
            <Icon name="arrow-right" />
          </TouchableOpacity>
          <View style={styles.separator}>
            <View style={[styles.separatorLine, styles.lineLeft]} />
            <Text style={styles.separatorLabel}>OR</Text>
            <View style={[styles.separatorLine, styles.lineRight]} />
          </View>
          <TextInput
            white
            value={this.state.url}
            placeholder="Graphql Server Url"
            onChangeText={this.onChangeUrl}
          />
          <Button outlineStyle title="Connect" onPress={this.onPressConnect} />
        </View>
        <MainframeBar footer />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingBottom: FOOTER_SIZE,
  },
  innerContainer: {
    width: 320,
  },
  icon: {
    marginBottom: BASIC_SPACING * 4,
  },
  defaultNodeButton: {
    height: 50,
    borderRadius: 25,
    marginBottom: BASIC_SPACING,
    backgroundColor: COLORS.PRIMARY_RED,
    paddingHorizontal: BASIC_SPACING * 2,
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  buttonText: {
    flexDirection: 'column',
  },
  defaultNodeButtonTitle: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
  },
  defaultNodeButtonSubtitle: {
    color: COLORS.WHITE,
    fontSize: 11,
  },
  separatorLabel: {
    fontSize: 11,
    color: COLORS.GRAY_47,
    marginHorizontal: BASIC_SPACING,
  },
  separator: {
    marginVertical: BASIC_SPACING * 1.5,
    flexDirection: 'row',
  },
  separatorLine: {
    flex: 1,
    height: 1,
    marginTop: 8,
    backgroundColor: COLORS.GRAY_D3,
    alignSelf: 'stretch',
  },
  lineLeft: {
    marginLeft: 50,
  },
  lineRight: {
    marginRight: 50,
  },
  errorContainer: {
    position: 'absolute',
    top: BASIC_SPACING * 2,
    left: BASIC_SPACING * 2,
    right: BASIC_SPACING * 2,
    padding: BASIC_SPACING,
    backgroundColor: COLORS.GRAY_E6,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
  },
})
