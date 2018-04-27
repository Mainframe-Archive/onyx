// @flow

import React, { Component } from 'react'
import { View, StyleSheet } from 'react-native'
import path, { dirname as getDirName } from 'path'

import Modal from './Modal'
import Text from './Text'
import Button from './Form/Button'
import Icon from './Icon'
import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

const Store = window.require('electron-store')
const fs = window.require('fs')
const mkdirp = window.require('mkdirp')
const { app } = window.require('electron').remote
const { is } = window.require('electron-util')

const store = new Store({ name: is.development ? 'onyx-dev' : 'onyx' })

export const storedCerts = () => store.get('certs')

type State = {
  inputValue: string,
  requiredFiles: { [string]: {
    path?: string,
    key: string,
  }},
}

type Props = {
  wsUrl: string,
  onRequestClose: () => void,
  onCopiedCerts: () => void,
}

export default class CertificateSelection extends Component<State> {

  constructor (props: Props) {
    super(props)
    const requiredFiles = [
      ['client-crt.pem', {key: 'cert'}],
      ['client-key.pem', {key: 'key'}],
      ['ca-crt.pem', {key: 'ca'}],
    ]
    this.state = {
      inputValue: '',
      requiredFiles: new Map(requiredFiles),
    }
  }

  bindFileInput = e => {
    this.fileInput = e
  }

  onDragOver = (event: SyntheticDragEvent<HTMLHeadingElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }

  onDrop = (event: SyntheticDragEvent<HTMLHeadingElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer.files.length) {
      this.handleSelectedFiles(Array.from(event.dataTransfer.files))
    }
  }

  onFileInputChange = () => {
    const files = [...this.fileInput.files]
    this.handleSelectedFiles(files)
  }

  handleSelectedFiles (files: Array<Object>) {
    files.forEach(f => {
      const requiredFile = this.state.requiredFiles.get(f.name)
      if (requiredFile && !requiredFile.path) {
        const userDataPath = app.getPath('userData')
        const destPath = path.join(userDataPath, 'certs', f.name)
        try {
          mkdirp(getDirName(destPath))
          fs.createReadStream(f.path).pipe(fs.createWriteStream(destPath))
          const requiredFile = this.state.requiredFiles.get(f.name)
          requiredFile.path = destPath
          this.setState({
            requiredFiles: this.state.requiredFiles.set(f.name, requiredFile)
          })
        } catch (err) {
          console.warn('error writing file: ', err)
        }
      }
    })
    const values = Array.from(this.state.requiredFiles.values())
    const missingPaths = values.find(v => !v.path)
    if (!missingPaths) {
      const certs = {}
      values.forEach((rf, key) => {
        certs[rf.key] = rf.path
      })
      store.set('certs', {
        filePaths: certs,
        wsUrl: this.props.wsUrl,
      })
      this.props.onCopiedCerts()
    }
  }

  onPressBrowse = () => {
    this.fileInput.click()
  }

  renderFileList = () => {
    const rows = []
    this.state.requiredFiles.forEach((f, name) => {
      const textStyles = [styles.fileLabel]
      let iconStyles = [styles.fileIcon]
      if (!f.path) {
        textStyles.push(styles.fileLabelFaded)
        iconStyles.push(styles.iconFaded)
      }
      rows.push(
        <View style={styles.fileRow} key={name}>
          <View style={iconStyles}>
            <Icon name="file-dark" />
          </View>
          <Text style={textStyles}>{name}</Text>
        </View>
      )
    })
    return rows
  }

  render() {
    const message = 'Please import the client SSL certificate files that were generated when you deployed your Onyx server.'
    return (
      <Modal
        onRequestClose={this.props.onRequestClose}
        title="Server Auth Certificates"
        isOpen
      >
        <Text style={styles.infoText}>
          {message}
        </Text>
        <View
          style={styles.filesContainer}
          onDragOver={this.onDragOver}
          onDrop={this.onDrop}
        >
          {this.renderFileList()}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Drag and drop or browse
            </Text>
            <Button
              onPress={this.onPressBrowse}
              title="Choose Files"
              style={styles.button}
              textStyle={styles.buttonText}
              />
            <input
              multiple
              onChange={this.onFileInputChange}
              ref={this.bindFileInput}
              type="file"
              hidden
              value={this.state.inputValue}
            />
          </View>
        </View>
      </Modal>
    )
  }
}

const styles = StyleSheet.create({
  filesContainer: {
    paddingHorizontal: BASIC_SPACING * 2,
    paddingVertical: BASIC_SPACING,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.GRAY_D3,
    borderStyle: 'dashed',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: BASIC_SPACING,
  },
  footerText: {
    paddingRight: BASIC_SPACING * 4,
  },
  infoText: {
    marginVertical: BASIC_SPACING,
  },
  button: {
    height: 40,
    paddingHorizontal: 30,
  },
  buttonText: {
    fontSize: 16,
  },
  fileRow: {
    paddingVertical: BASIC_SPACING,
    flexDirection: 'row',
  },
  fileLabel: {
    fontSize: 14,
    color: COLORS.DARK_GRAY,
  },
  fileLabelFaded: {
    color: COLORS.GRAY_D3,
  },
  fileIcon: {
    paddingRight: 6,
  },
  iconFaded: {
    opacity: 0.4,
  },
})
