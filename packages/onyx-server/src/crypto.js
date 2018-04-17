// @flow

import CryptoJS from 'crypto-js'

export const pubKeyToAddress = (pubKey: string) => {
  const key = CryptoJS.enc.Hex.parse(pubKey.substr(4))
  const hash = CryptoJS.SHA3(key, { outputLength: 256 })
  return '0x' + hash.toString(CryptoJS.enc.Hex).slice(24)
}
