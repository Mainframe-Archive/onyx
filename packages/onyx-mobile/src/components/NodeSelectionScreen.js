// @flow

import React, { Component } from 'react'
import RNFS from 'react-native-fs'

import {
  Platform,
  View,
  StyleSheet,
  TouchableOpacity,
  AsyncStorage,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import Text from './shared/Text'
import TextInput from "./shared/TextInput"
import ColoredLine from './shared/ColoredLine'
import CodeScanner from './shared/CodeScanner'
import Icon from './shared/Icon'
import Button from './shared/Button'
import colors from './colors'
import Modal from './shared/Modal'
import { BASIC_SPACING } from './styles'

type Props = {
  onSelectNode: (
    nodeUrl: string,
    certFilePath: string,
    certPassword: string,
  ) => void
}

type State = {
  selectedNodeUrl?: string,
  certPassword?: string,
  certFilePath?: string,
  certFetchErr?: string,
  showCertsImport?: boolean,
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
      const protocol = this.state.selectedNodeUrl.split('://')[0]
      if (protocol === 'wss') {
        this.setState({
          showCertsImport: true,
        })
        this.fetchCerts()
      } else {
        this.setState({
          certFetchErr: 'secure web socket url required',
        })
      }
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

  onCloseModal = () => {
    this.setState({
      showCertsImport: false,
    })
  }

  onChangeCertPassword = (value) => {
    this.setState({
      certPassword: value,
    })
  }

  onSubmitPassword = () => {
    this.onCloseModal()
    this.persistUrl(this.state.selectedNodeUrl)
    this.props.onSelectNode(
      this.state.selectedNodeUrl,
      this.state.certFilePath,
      this.state.certPassword,
    )
  }

  async fetchCerts () {
    console.log('fetching certs: ', RNFS.MainBundlePath)
    const dirPath = Platform.OS === 'ios'
      ? RNFS.DocumentDirectoryPath + '/attachments'
      : RNFS.ExternalStorageDirectoryPath + '/attachments'
    try {
      await RNFS.mkdir(dirPath, { RNFSURLIsExcludedFromBackupKey: true })
      const fileDirPath = dirPath + '/' + 'client.p12'
      const bg = false
      const file = RNFS.downloadFile({
        fromUrl: 'http://localhost:5002/mobile_client_cert',
        toFile: fileDirPath,
        bg,
      })
      console.log('file: ', file)
      this.setState({
        certFilePath: fileDirPath,
      })
    } catch (err) {
      console.log('err: ', err)
      this.setState({
        certFetchErr: 'Error fetching client ssl certificate, please ensure you enetered the correct server url'
      })
    }
  }

  // RENDER

  renderScanner () {
    return this.state.openScanner ? (
      <CodeScanner onScanQR={this.onScanQR} onRequestClose={this.closeScanner}/>
    ) : null
  }

  renderCertImport () {
    if (this.state.showCertsImport) {
      const content = this.state.certFilePath ? (
        <View>
          <TextInput
            onChangeText={this.onChangeCertPassword}
            placeholder="password"
            value={this.state.certPassword}
            style={styles.passwordInput}
          />
          <Button
            title="Done"
            style={styles.passwordButton}
            onPress={this.onSubmitPassword}
            />
        </View>
      ) : (
        <ActivityIndicator />
      )
      return (
        <Modal
          title="SSL Certificate"
          onRequestClose={this.onCloseModal}
          >
          <View>
            {content}
          </View>
        </Modal>
      )
    }
    return null
  }

  render() {
    const dims = Dimensions.get('window')
    const imageHeight = 314 / 800 * (dims.width - (BASIC_SPACING * 4))
    const imageContainerStyles = [styles.imageContainer, {height: imageHeight}]
    return (
      <View style={styles.container}>
        {this.renderCertImport()}
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
  },
  passwordInput: {
    backgroundColor: colors.LIGHT_GRAY,
  },
  passwordButton: {
    marginTop: BASIC_SPACING,
  },
})
