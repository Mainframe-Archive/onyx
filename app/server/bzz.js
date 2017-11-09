// @flow

import debug from 'debug'
import { buffer, send } from 'micro'
import { get, post } from 'microrouter'

import Bzz from './lib/Bzz'

export default (swarmHttpUrl: string) => {
  const bzz = new Bzz(swarmHttpUrl)
  const log = debug('dcd:bzz')

  return [
    get('/files/:hash', async (req, res) => {
      log('request file', req.params.hash)
      const file = await bzz.downloadRawBuffer(req.params.hash)
      if (file) {
        return file
      }
      send(res, 404, 'not found')
    }),
    post('/files', async (req, res) => {
      const file = await buffer(req, { limit: '10mb' })
      const hash = await bzz.uploadRaw(file, {
        'content-length': file.length,
        'content-type': req.headers['content-type'],
      })
      log('uploaded file', hash)
      return hash
    }),
  ]
}
