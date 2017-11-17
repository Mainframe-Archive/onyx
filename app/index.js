const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const isDev = require('electron-is-dev')
const Store = require('electron-store')
const getPort = require('get-port')
const createOnyxServer = require('onyx-server').default
const path = require('path')
const StaticServer = require('static-server')
const url = require('url')

const { config } = require(path.join(__dirname, 'package.json'))
const SWARM_WS_URL =
  process.env.SWARM_WS_URL ||
  (config && config.swarmWsUrl) ||
  'ws://localhost:8546'
const SWARM_HTTP_URL =
  process.env.SWARM_HTTP_URL ||
  (config && config.swarmHttpUrl) ||
  'http://localhost:8500'

const loadingWindowURL = url.format({
  protocol: 'file',
  slashes: true,
  pathname: path.join(__dirname, 'loading.html'),
})

const menu = Menu.buildFromTemplate([
  {
    label: is.macos ? 'Onyx' : 'File',
    submenu: [
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
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
        accelerator: is.macos ? 'Alt+Command+I' : 'Ctrl+Shift+I',
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

let appServer, loadingWindow, mainWindow

const store = new Store({ name: isDev ? 'onyx-dev' : 'onyx' })

const createMainWindow = async url => {
  await appReady

  Menu.setApplicationMenu(menu)

  mainWindow = new BrowserWindow({ width: 800, height: 600, show: false })

  mainWindow.loadURL(url)

  mainWindow.on('ready-to-show', () => {
    if (loadingWindow) {
      loadingWindow.close()
    }
    mainWindow.show()
  })

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
      resolve(appServer)
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
  const appPort = isDev ? 3000 : await startAppServer()
  const serverPort = await startOnyxServer(appPort)
  const url = `http://localhost:${appPort}/?port=${serverPort}`

  let appPort
  if (is.development) {
    appPort = 3000
  } else {
    if (appServer == null) {
      appServer = await startAppServer()
    }
    appPort = appServer.port
  }

  try {
    const graphqlPort = await startGraphQLServer(appPort)
    const url = `http://localhost:${appPort}/?port=${graphqlPort}`

    createMainWindow(url)
    app.on('activate', () => {
      if (mainWindow == null) {
        createMainWindow(url)
      }
    })
  } catch (err) {
    if (appServer != null) {
      appServer.stop()
    }

    if (loadingWindow == null) {
      console.error(err)
    } else {
      loadingWindow.webContents.on('did-finish-load', () => {
        loadingWindow.webContents.send('connection-failed')
      })
    }
  }
}

ipcMain.on('restart', () => {
  if (mainWindow != null) {
    mainWindow.close()
    mainWindow = null
  }
  start()
})

start()
