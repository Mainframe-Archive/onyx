/* @flow */

import React, { Component } from 'react'

type Props = {
  onFilesSelected: (files: Array<Object>) => void,
}

type State = {
  inputValue: string,
}

class FileSelector extends Component<Props, State> {
  fileInput: {
    files: Array<Object>,
    click: () => void,
  }

  state = {
    inputValue: '',
  }

  bindFileInput = (e: any) => {
    this.fileInput = e
  }

  openFileSelector = () => {
    this.fileInput.click()
  }

  onFileInputChange = () => {
    const files = [...this.fileInput.files]
    this.props.onFilesSelected(files)
    this.setState({
      inputValue: '',
    })
  }

  render() {
    const accept = this.props.imagesOnly
      ? 'image/jpg,image/png,image/gif,image/jpeg'
      : '*'
    return (
      <input
        multiple
        onChange={this.onFileInputChange}
        ref={this.bindFileInput}
        hidden
        accept={accept}
        type="file"
        value={this.state.inputValue}
      />
    )
  }
}

export default FileSelector
