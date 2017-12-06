// @flow

import debug from 'debug'
import { BZZ } from 'erebos'
import getRawBody from 'raw-body'

export default (swarmHttpUrl: string, app: express$Application) => {
  const bzz = new BZZ(swarmHttpUrl)

  app.get('/files/:hash', async (req: express$Request, res: express$Response) => {
    const file = await bzz.downloadRawBuffer(req.params.hash)
    if (file) {
      res.send(file)
    } else {
      res.status(404).send('not found')
    }
  })

  app.post('/files', async (req: express$Request, res: express$Response) => {
    try {
      const file = await getRawBody(req, { limit: '10mb' })
      const hash = await bzz.uploadRaw(file, {
        'content-type': req.headers['content-type'],
      })
      res.send(hash)
    } catch (err) {
      res.sendStatus(500)
    }
  })
}
