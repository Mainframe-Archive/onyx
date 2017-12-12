// @flow
import React, { Component } from 'react'

import ArrowRight from './icons/arrow-right.svg'
import PlusIcon from './icons/plus.svg'
import RedCloseIcon from './icons/red-close.svg'
import Checkmark from './icons/checkmark.svg'
import MaskGray from './icons/mask-gray.svg'
import MaskRed from './icons/mask-red.svg'
import MaskBlue from './icons/mask-blue.svg'
import FlashGray from './icons/flash-gray.svg'
import FlashRed from './icons/flash-red.svg'
import FlashBlue from './icons/flash-blue.svg'
import MainframeLogo from './icons/mainframe-logo.svg'
import MainframeIcon from './icons/mainframe-icon.svg'
import SeeQR from './icons/see-qr.svg'
import CircledCross from './icons/circled-cross.svg'
import File from './icons/file.svg'
import FileDark from './icons/file-dark.svg'
import FileRed from './icons/file-red.svg'
import Pdf from './icons/pdf.svg'
import GenericFile from './icons/generic-file.svg'
import Download from './icons/download.svg'
import Camera from './icons/camera_icon.svg'

const ICONS = {
  plus: PlusIcon,
  'arrow-right': ArrowRight,
  'red-close': RedCloseIcon,
  checkmark: Checkmark,
  'flash-red': FlashRed,
  'flash-gray': FlashGray,
  'flash-blue': FlashBlue,
  'mask-red': MaskRed,
  'mask-gray': MaskGray,
  'mask-blue': MaskBlue,
  'mainframe-logo': MainframeLogo,
  'mainframe-icon': MainframeIcon,
  'see-qr': SeeQR,
  'circled-cross': CircledCross,
  file: File,
  'file-dark': FileDark,
  'file-red': FileRed,
  download: Download,
  pdf: Pdf,
  'generic-file': GenericFile,
  camera: Camera,
}

type Props = {
  name: string,
}

export default class Icon extends Component<Props> {
  render() {
    return <img alt={this.props.name} src={ICONS[this.props.name]} />
  }
}
