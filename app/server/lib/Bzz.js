// @flow

import { Buffer } from 'buffer'
import fetch from 'node-fetch'

export default class Bzz {
  _url: string

  constructor(url: string) {
    this._url = url
  }

  async uploadRaw(data: string | Buffer, headers: Object): Promise<string> {
    const res = await fetch(`${this._url}/bzzr:`, {
      body: typeof data === 'string' ? Buffer.from(data) : data,
      headers,
      method: 'POST',
    })
    const hash = await res.text()
    return hash
  }

  downloadRaw(hash: string): Promise<Object> {
    return fetch(`${this._url}/bzzr:/${hash}`)
  }

  // DOM-only
  downloadRawBlob(hash: string): Promise<Blob> {
    return this.downloadRaw(hash).then(res => res.blob())
  }

  // node-only
  downloadRawBuffer(hash: string): Promise<Buffer> {
    return this.downloadRaw(hash).then(res => res.buffer())
  }

  downloadRawText(hash: string): Promise<string> {
    return this.downloadRaw(hash).then(res => res.text())
  }
}
