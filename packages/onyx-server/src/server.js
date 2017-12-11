// @flow

import debug from 'debug'
import type { PSS } from 'erebos'
import https from 'https'
import http from 'http'
import fs from 'fs'
import express from 'express'
import cors from 'cors'
import path from 'path'

import type DB from './db'
import createBzzRoutes from './bzz'
import graphqlServer from './graphql/server'

export default (
  pss: PSS,
  db: DB,
  httpUrl: string,
  port: number,
  useTLS: boolean,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const log = debug('onyx:server')

    const app = express()
    app.use(cors())

    const graphql = graphqlServer(pss, db, port, app)
    createBzzRoutes(httpUrl, app)

    let server
    if (useTLS) {
      const options: { [string]: any } = {
        requestCert: true,
        rejectUnauthorized: true,
      }

      try {
        options.key = fs.readFileSync(path.join('certs', 'server-key.pem'))
        options.cert = fs.readFileSync(path.join('certs', 'server-crt.pem'))
        options.ca = fs.readFileSync(path.join('certs', 'ca-crt.pem'))
      } catch (err) {
        console.warn(
          `error reading ssl certificates, please make sure to run the certificate generation script.\n ${
            err
          }`,
        )
        throw err
      }
      server = https.createServer(options, app)
    } else {
      server = http.createServer(app)
    }

    server.listen(port, 'localhost', err => {
      if (err) {
        reject(err)
      } else {
        log(`running on port ${port}`)
        graphql.onCreated(server)
        resolve(server)
      }
    })
  })
}
