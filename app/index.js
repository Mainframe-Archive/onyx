const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const { appReady, is } = require('electron-util')
const getPort = require('get-port')
const path = require('path')
const StaticServer = require('static-server')
const url = require('url')

const createGraphQLServer = require('./server').default

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

const createLoadingWindow = async () => {
  await appReady
  if (loadingWindow != null || mainWindow != null) {
    return
  }

  loadingWindow = new BrowserWindow({ width: 400, height: 300, show: false })

  loadingWindow.loadURL(loadingWindowURL)

  loadingWindow.once('ready-to-show', () => {
    loadingWindow.show()
  })

  loadingWindow.on('closed', () => {
    loadingWindow = null
  })
}

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

const startGraphQLServer = async appPort => {
  const graphqlPort = await getPort()
  await createGraphQLServer(SWARM_WS_URL, SWARM_HTTP_URL, graphqlPort, appPort)
  return graphqlPort
}

const start = async () => {
  createLoadingWindow()

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
