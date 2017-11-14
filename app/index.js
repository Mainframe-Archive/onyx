const { app, BrowserWindow, Menu } = require('electron')
const isDev = require('electron-is-dev')
const getPort = require('get-port')
const path = require('path')
const StaticServer = require('static-server')

const createGraphQLServer = require('./server').default

const { config } = require(path.join(__dirname, 'package.json'))
const SWARM_WS_URL =
  process.env.SWARM_WS_URL ||
  (config && config.swarmWsUrl) ||
  'ws://localhost:8501'
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

const startGraphQLServer = async appPort => {
  const graphqlPort = await getPort()
  await createGraphQLServer(SWARM_WS_URL, SWARM_HTTP_URL, graphqlPort, appPort)
  return graphqlPort
}

const start = async () => {
  const appPort = isDev ? 3000 : await startAppServer()
  const graphqlPort = await startGraphQLServer(appPort)
  const url = `http://localhost:${appPort}/?port=${graphqlPort}`

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

start()
