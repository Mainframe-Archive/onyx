const { app, BrowserWindow, Menu } = require('electron')
const isDev = require('electron-is-dev')
const Store = require('electron-store')
const execa = require('execa')
const { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } = require('fs')
const getPort = require('get-port')
const createOnyxServer = require('onyx-server').default
const StaticServer = require('static-server')
const path = require('path')
// Note: always use `path.join()` to make sure delimiters work cross-platform
// Some platform-specific logic may be needed here, ex using geth.exe on Windows,
// for this you can use electron-util: https://github.com/sindresorhus/electron-util/blob/master/index.js#L17-L19
const pwdPath = path.join(app.getPath('userData'), 'pwd')
const dataDir = path.join(app.getPath('userData'), 'data')
const keystorePath = path.join(app.getPath('userData'), 'data', 'keystore')

const setupGeth = async () => {
  console.log("setupGeth() called")
  const gethPath = path.join(process.resourcesPath, 'bin', 'geth')

  // Could be made async, shouldn't be an issue though
  writeFileSync(pwdPath, 'secret')
  try {
    mkdirSync(dataDir)
  } catch (err) {
    // Likely directory already exists, better check though
    // See https://nodejs.org/api/fs.html#fs_fs_mkdir_path_mode_callback
  }

  // Create the account - other commands should work the same way
  const res = await execa(gethPath, [
    '--datadir',
    dataDir,
    'account',
    'new',
    '--password',
    pwdPath,
  ])
  console.log(res)
}

const setupSwarm = async () => {
  console.log("setupSwarm() called")
  const swarmPath = path.join(process.resourcesPath, 'bin', 'swarm')
  const keystoreFiles = readdirSync(keystorePath)
  const keyFileName = keystoreFiles[0]
  const keyFilePath = path.join(keystorePath, keyFileName)
  const keystore = JSON.parse(readFileSync(keyFilePath, 'utf8'))

  const res = await execa(swarmPath, [
    '--datadir',
    dataDir,
    '--password',
    pwdPath,
    '--bzzaccount',
    keystore.address,
    '--pss',
    // '--verbosity 4',
    // '--bzznetworkid 922',
    // '--bootnodes enode://e834e83b4ed693b98d1a31d47b54f75043734c6c77d81137830e657e8b005a8f13b4833efddbd534f2c06636574d1305773648f1f39dd16c5145d18402c6bca3@54.171.164.15:30399',
    // '--ws',
    // '--wsorigins "*"'
  ])
  console.log("\n setupSwarm res", res)
}

const { config } = require(path.join(__dirname, 'package.json'))
const SWARM_WS_URL =
  process.env.SWARM_WS_URL ||
  (config && config.swarmWsUrl) ||
  'ws://localhost:8546'
const SWARM_HTTP_URL =
  process.env.SWARM_HTTP_URL ||
  (config && config.swarmHttpUrl) ||
  'http://localhost:8500'

const menu = Menu.buildFromTemplate([
  {
    label: 'Application',
    submenu: [
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit()
        },
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        selector: 'selectAll:',
      },
    ],
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: (item, focusedWindow) => {
          if (focusedWindow) focusedWindow.reload()
        },
      },
      {
        label: 'Toggle Developer Tools',
        accelerator:
          process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click: (item, focusedWindow) => {
          if (focusedWindow) focusedWindow.toggleDevTools()
        },
      },
      { type: 'separator' },
      { role: 'togglefullscreen' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
    ],
  },
])

const store = new Store({ name: isDev ? 'onyx-dev' : 'onyx' })

let mainWindow

const createWindow = url => {
  Menu.setApplicationMenu(menu)

  mainWindow = new BrowserWindow({ width: 800, height: 600 })

  mainWindow.loadURL(url)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const startAppServer = async () => {
  const appPort = await getPort()
  const appServer = new StaticServer({
    rootPath: path.join(__dirname, 'build'),
    port: appPort,
  })

  return new Promise(resolve => {
    appServer.start(() => {
      app.on('quit', () => {
        appServer.stop()
      })
      resolve(appPort)
    })
  })
}

const startOnyxServer = async () => {
  const port = await getPort()
  await createOnyxServer({
    wsUrl: SWARM_WS_URL,
    httpUrl: SWARM_HTTP_URL,
    port,
    store,
  })
  return port
}

const start = async () => {
  console.log("\n start() called")
  if (!existsSync(keystorePath)) {
    await setupGeth()
  }
  const swarmTemp = await setupSwarm()
  const appPort = isDev ? 3000 : await startAppServer()
  const serverPort = await startOnyxServer(appPort)
  const url = `http://localhost:${appPort}/?port=${serverPort}`

  if (app.isReady()) {
    createWindow(url)
  } else {
    app.on('ready', () => {
      createWindow(url)
    })
  }

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow(url)
    }
  })
}

// TODO: remove this
process.on('unhandledRejection', (reason, p) => {
  console.log('\n Unhandled Rejection at: Promise', p, 'reason:', reason)
  // application specific logging, throwing an error, or other logic here
})

start()
