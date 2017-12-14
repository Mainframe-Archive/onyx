// @flow

import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity, AsyncStorage, Image, Dimensions } from 'react-native'
import Text from './shared/Text'
import TextInput from "./shared/TextInput"
import ColoredLine from './shared/ColoredLine'
import CodeScanner from './shared/CodeScanner'
import Icon from './shared/Icon'
import Button from './shared/Button'
import colors from './colors'
import { BASIC_SPACING } from './styles'

type Props = {
  onSelectNode: (nodeUrl: string) => void
}

type State = {
  selectedNodeUrl?: string,
  previousUrls: Array<string>
}

export default class NodeSelectionScreen extends Component<Props, State> {
  state = {
    previousUrls: []
  }

  componentDidMount() {
    this.fetchStoredNodes()
  }

  async fetchStoredNodes() {
    try {
      const value = await AsyncStorage.getItem("NODE_URLS")
      if (value !== null) {
        const urls = JSON.parse(value)
        if (urls.length) {
          this.setState({
            previousUrls: urls,
            selectedNodeUrl: urls[urls.length - 1]
          })
        }
      }
    } catch (error) {
      console.warn(error)
    }
  }

  async persistUrl(url: string) {
    const newUrlsArray = this.state.previousUrls
    const storedUrlIndex = newUrlsArray.indexOf(url)
    if (storedUrlIndex !== -1) {
      newUrlsArray.splice(storedUrlIndex, 1)
    }
    newUrlsArray.push(url)
    try {
      await AsyncStorage.setItem("NODE_URLS", JSON.stringify(newUrlsArray))
    } catch (error) {
      console.warn(error)
    }
  }

  onPress = () => {
    if (this.state.selectedNodeUrl) {
      this.persistUrl(this.state.selectedNodeUrl)
      this.props.onSelectNode(this.state.selectedNodeUrl)
    }
  }

  onChangeInput = (value: string) => {
    this.setState({
      selectedNodeUrl: value
    })
  }

  onPressScanQR = () => {
    this.setState({
      openScanner: true,
    })
  }

  onScanQR = (value: string) => {
    this.setState({
      openScanner: false,
      selectedNodeUrl: value,
    })
  }

  closeScanner = () => {
    this.setState({
      openScanner: false,
    })
  }

  // RENDER

  renderScanner () {
    return this.state.openScanner ? (
      <CodeScanner onScanQR={this.onScanQR} onRequestClose={this.closeScanner}/>
    ) : null
  }

  render() {
    const dims = Dimensions.get('window')
    const imageHeight = 314 / 800 * (dims.width - (BASIC_SPACING * 4))
    const imageContainerStyles = [styles.imageContainer, {height: imageHeight}]
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} fontStyle="bold">Connect</Text>
          <ColoredLine />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            autoCapitalize={false}
            autoCorrect={false}
            placeholder={"GraphQl server url"}
            style={styles.textInput}
            onChangeText={this.onChangeInput}
            value={this.state.selectedNodeUrl}
            underlineColorAndroid="transparent"
          />
          <TouchableOpacity onPress={this.onPressScanQR} style={styles.scanButton}>
            <Icon name="md-qr-scanner" size={22} color={colors.WHITE} />
          </TouchableOpacity>
        </View>
        <Button onPress={this.onPress} style={styles.button} title="Connect" />
        {this.renderScanner()}
        <View style={imageContainerStyles}>
          <Image
            style={styles.image}
            resizeMode="contain"
            source={require('../../assets/images/branding_shape.png')}
          />
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    paddingTop: 45,
    backgroundColor: colors.LIGHT_GRAY
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: BASIC_SPACING,
  },
  title: {
    alignSelf:'stretch',
    fontSize: 22,
    color: colors.PRIMARY_BLUE,
    marginRight: BASIC_SPACING,
  },
  textInput: {
    height: 50,
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: colors.WHITE,
    fontSize: 14,
    paddingRight: 50,
  },
  scanButton: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: colors.PRIMARY_RED,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  button: {
    marginTop: 20,
  },
  imageContainer: {
    position: 'absolute',
    right: BASIC_SPACING * 2,
    left: BASIC_SPACING * 2,
    bottom: -2,
  },
  image: {
    flex: 1,
    height: undefined,
    width: undefined,
  }
})
