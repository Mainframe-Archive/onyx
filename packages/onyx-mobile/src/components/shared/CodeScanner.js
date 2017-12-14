// @flow
import React, { Component } from 'react'
import { Modal, View, StyleSheet, TouchableOpacity, Dimensions} from 'react-native'
// import { BarCodeScanner, Permissions } from 'expo'

import Text from './Text'
import Icon from './Icon'
import colors from '../colors'
import { BASIC_SPACING } from '../styles'

type Props = {
  onScanQR: (result: string) => void,
  onRequestClose: () => void,
}

type State = {
  hasCameraPermission?: boolean,
}

export default class QRScanner extends Component<Props> {

  state = {}

  componentDidMount () {
    this.requestCameraPermission()
  }

  requestCameraPermission = async () => {
    // const { status } = await Permissions.askAsync(Permissions.CAMERA)
    // this.setState({
    //   hasCameraPermission: status === 'granted',
    // })
  }

  handleQRCodeRead = (result) => {
    this.props.onScanQR(result.data)
  }

  // RENDER

  render () {
    const { onRequestClose } = this.props
    const dims = Dimensions.get('window')
    const scannerSize = dims.width - (BASIC_SPACING * 4)
    return this.state.hasCameraPermission ? (
      <Modal>
        <View style={styles.container}>
          <TouchableOpacity style={styles.close} onPress={onRequestClose}>
            <Icon name="md-close" size={40} color={colors.LIGHT_BLUE_TRANSPARENT} />
          </TouchableOpacity>
          <Text fontStyle="bold" style={styles.title}>Scan QR Code</Text>
          <View style={styles.scanContainer}>
          {
            // <BarCodeScanner
            //   onBarCodeRead={this.handleQRCodeRead}
            //   style={{ width: scannerSize, height: scannerSize }}
            // />
          }
          </View>
        </View>
      </Modal>
    ) : null
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.PRIMARY_BLUE,
  },
  header: {
    paddingTop: BASIC_SPACING * 2,
    padding: BASIC_SPACING,
  },
  close: {
    position: 'absolute',
    top: BASIC_SPACING * 1.8,
    right: BASIC_SPACING / 2,
    width: 40,
    height: 30,
  },
  title: {
    color: colors.WHITE,
    fontSize: 20,
    marginTop: BASIC_SPACING * 2
  },
  scanContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 50,
  },
})
