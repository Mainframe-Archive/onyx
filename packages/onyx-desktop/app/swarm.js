const { app } = require('electron')
const { is } = require('electron-util')
const execa = require('execa')
const {
  createWriteStream,
  ensureDir,
  pathExists,
  readdir,
  readJson,
  remove,
  writeFile,
} = require('fs-extra')
const path = require('path')
const os = require('os')

const platform = {
  darwin: 'mac',
  linux: 'linux',
  win32: 'win',
}[os.platform()]

const getBinPath = is.development
  ? name => path.join(app.getAppPath(), '..', 'bin', `${name}-${platform}`)
  : name => path.join(process.resourcesPath, 'bin', name)

const dataDir = path.join(app.getPath('userData'), 'data')
const pwdPath = path.join(dataDir, 'pwd')
const keystorePath = path.join(dataDir, 'keystore')
const logPath = path.join(dataDir, 'node.log')
const gethPath = getBinPath('geth')
const swarmPath = getBinPath('swarm')

let proc

const setup = async () => {
  if (await pathExists(keystorePath)) {
    console.log('keystore exists, skip setup')
    return
  }

  await ensureDir(dataDir)
  await writeFile(pwdPath, 'secret')
  await execa(gethPath, [
    '--datadir',
    dataDir,
    '--password',
    pwdPath,
    'account',
    'new',
  ])
}

const start = async () => {
  const keystoreFiles = await readdir(keystorePath)
  const keyFilePath = path.join(keystorePath, keystoreFiles[0])
  const keystore = await readJson(keyFilePath)

  return new Promise((resolve, reject) => {
    proc = execa(swarmPath, [
      '--datadir',
      dataDir,
      '--password',
      pwdPath,
      '--bzzaccount',
      keystore.address,
      '--pss',
      '--verbosity',
      '4',
      '--bzznetworkid',
      '922',
      '--bootnodes',
      'enode://e834e83b4ed693b98d1a31d47b54f75043734c6c77d81137830e657e8b005a8f13b4833efddbd534f2c06636574d1305773648f1f39dd16c5145d18402c6bca3@52.51.239.180:30399',
      '--ws',
      '--wsorigins',
      '*',
      '--ens-api',
      'https://ropsten.infura.io/',
    ])

    proc.catch(error => {
      console.error('Failed to start Swarm node: ', error.stderr)
      reject(error.stderr)
    })

    proc.stderr.pipe(createWriteStream(logPath))

    proc.stdout.on('data', data => {
      const dataStr = data.toString()
      if (dataStr.toLowerCase().indexOf('fatal:') !== -1) {
        const error = new Error(`Swarm error: ${dataStr}`)
        console.log(error)
        reject(error)
      }
    })

    proc.stderr.on('data', data => {
      if (
        data
          .toString()
          .toLowerCase()
          .indexOf('websocket endpoint opened') !== -1
      ) {
        console.log('Swarm node started')
        resolve()
      }
    })
  })
}

const stop = () => {
  return proc
    ? new Promise(resolve => {
        proc.once('exit', resolve)
        proc.kill()
        proc = undefined
      })
    : Promise.resolve()
}

const reset = async () => {
  await stop()
  await remove(dataDir)
  await setup()
}

module.exports = { reset, setup, start, stop }
