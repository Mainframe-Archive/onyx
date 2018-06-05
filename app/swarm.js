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
      '--verbosity',
      '4',
      '--bzznetworkid',
      '1000',
      '--bootnodes',
      'enode://b3417a20b07104ce2f948d7458fc03c73ad5918ae6be24eaf840322c70ffa8d0f59473139bef8ef0b4caffe7bc99018ab3686b1a757d73c1a7bfd880d2b7e7ef@52.31.117.198:30399,enode://762d482f6a400c89210be4d180b192dd5f921ca9f1a42a1651293f242613874f3e4e22589be582e0837c816c0c5366c00c32b7760ca345d65eb9ed75897db8c0@54.153.70.43:30399,enode://fc8d3eb2d5cfe4ed05c9e722518c895e006456448a49c2915e30beffd1ddb1ee17cd12abd550f1745d8b17060bf6c46e822e051ae4deca0e21d7fa7a15bb4c43@13.113.67.30:30399',
      '--ws',
      '--wsorigins',
      '*',
      '--ens-api',
      'https://mainnet.infura.io/55HkPWVAJQjGH4ucvfW9',
      '--nosync',
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
