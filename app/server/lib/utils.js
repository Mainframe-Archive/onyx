// @flow

import { Buffer } from 'buffer'
import { randomBytes } from 'crypto'

const hexToBuffer = (hex: string) => Buffer.from(hex.substr(2), 'hex')

export const encodeHex = (
  input: string | Array<number>,
  from: string = 'utf8',
): string => '0x' + Buffer.from(input, from).toString('hex')

export const decodeHex = (hex: string, to: string = 'utf8'): string =>
  hexToBuffer(hex).toString(to)

export const base64ToArray = (key: string) =>
  Array.from(Buffer.from(key, 'base64'))

export const base64ToHex = (str: string) => encodeHex(str, 'base64')

export const hexToBase64 = (hex: string) => decodeHex(hex, 'base64')

export const hexToArray = (hex: string) => Array.from(hexToBuffer(hex))

export const encodeData = (data: Object = {}): string =>
  encodeHex(JSON.stringify(data))

export const decodeData = (hex: string): Object => JSON.parse(decodeHex(hex))

export const encodeMessage = (msg: string) => Array.from(Buffer.from(msg))

export const decodeMessage = (msg: string) =>
  Buffer.from(msg, 'base64').toString()

export const createKey = (size: number = 32, asString: boolean = false) => {
  const key = randomBytes(size)
  return asString ? Buffer.from(key).toString('hex') : Array.from(key)
}
