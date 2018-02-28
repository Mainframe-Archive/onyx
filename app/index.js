const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron')
const { appReady, is } = require('electron-util')
const Store = require('electron-store')
const getPort = require('get-port')
const createOnyxServer = require('onyx-server').default
const StaticServer = require('static-server')
const path = require('path')
const querystring = require('querystring')

const { config } = require(path.join(__dirname, 'package.json'))
const swarm = require('./swarm')

const USE_TESTNET = process.env.USE_TESTNET || true // TODO: - Update to Mainnet when ready

const SWARM_WS_URL =
  process.env.SWARM_WS_URL ||
  (config && config.swarmWsUrl) ||
  'ws://localhost:8546'
const SWARM_HTTP_URL =
  process.env.SWARM_HTTP_URL ||
  (config && config.swarmHttpUrl) ||
  'https://onyx-storage.mainframe.com'

let appServer, mainWindow

const shouldQuit = app.makeSingleInstance(() => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

if (shouldQuit) {
  app.quit()
}

const store = new Store({ name: is.development ? 'onyx-dev' : 'onyx' })

const menu = Menu.buildFromTemplate([
  {
    label: is.macos ? app.getName() : 'File',
    submenu: [
      {
        label: 'v' + app.getVersion(),
        enabled: false,
      },
      {
        type: 'separator',
      },
      {
        label: 'Reset',
        click: (item, focusedWindow) => {
          dialog.showMessageBox(
            focusedWindow,
            {
              type: 'warning',
              message:
                'Resetting the application will clear ALL data and your local Swarm identity. Are you sure you want to continue?',
              cancelId: 0,
              buttons: ['Cancel', 'Confirm'],
            },
            async index => {
              if (index === 1) {
                store.delete('wsUrl')
                store.delete('certs')
                await swarm.reset()
                start()
              }
            },
          )
        },
      },
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

const createMainWindow = async url => {
  await appReady

  Menu.setApplicationMenu(menu)

  mainWindow = new BrowserWindow({ width: 800, height: 600, show: false })
  mainWindow.loadURL(url)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })
  mainWindow.on('closed', () => {
    swarm.stop()
    app.quit()
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

const startLocalOnyxServer = async () => {
  const port = await getPort()
  await createOnyxServer({
    wsUrl: SWARM_WS_URL,
    httpUrl: SWARM_HTTP_URL,
    port,
    store,
    unsecure: true,
    testNet: USE_TESTNET,
  })
  return port
}

const start = async () => {
  let appPort
  if (is.development) {
    appPort = 3000
  } else {
    if (appServer == null) {
      appServer = await startAppServer()
    }
    appPort = appServer.port
  }
  let appUrl = `http://localhost:${appPort}`
  let urlParams
  let nodeAddress

  const storedWsUrl = store.get('wsUrl')
  if (storedWsUrl) {
    if (storedWsUrl === 'local') {
      let errorMsg

      try {
        await swarm.setup()
      } catch (e) {
        console.log(e.stack)
        errorMsg =
          'There was an error setting up the Geth account\nDebug: ' +
          e.toString()
      }

      if (!errorMsg) {
        try {
          await swarm.start()
        } catch (e) {
          console.log(e.stack)
          errorMsg =
            'There was an error starting the local Swarm node, you may want to check if you have a Swarm node running already, or if the port 30399 is in use\nDebug: ' +
            e.toString()
        }
      }

      if (!errorMsg) {
        try {
          const serverPort = await startLocalOnyxServer(appPort)
          urlParams = { wsUrl: `ws://localhost:${serverPort}/graphql` }
        } catch (e) {
          console.log(e.stack)
          swarm.stop()
          if (e.message.startsWith('Missing stake')) {
            nodeAddress = e.address
            errorMsg = 'You need to stake Mainframe tokens for your node'
          } else {
            errorMsg =
              'There was an error starting the local GraphQL server, you may want to check you have a Swarm node WebSocket interface listening on ' +
              SWARM_WS_URL +
              '\nDebug: ' +
              e.toString()
          }
        }
      }

      if (errorMsg) {
        urlParams = {
          address: nodeAddress,
          wsUrl: storedWsUrl,
          connectionError: errorMsg,
          testNet: USE_TESTNET,
        }
        if (appServer != null) {
          appServer.stop()
        }
      }
    } else {
      // Use stored remote server url
      let domain
      if (storedWsUrl.indexOf('://') !== -1) {
        domain = storedWsUrl.split('/')[2]
      } else if (storedWsUrl.indexOf('/') !== -1) {
        domain = storedWsUrl.split('/')[0]
      }
      urlParams = { wsUrl: storedWsUrl }
      if (!domain) {
        urlParams.connectionError = 'Invalid ws url'
      }
    }
  }

  if (urlParams != null) {
    appUrl += '?' + querystring.stringify(urlParams)
  }

  if (mainWindow == null) {
    createMainWindow(appUrl)
  } else {
    mainWindow.loadURL(appUrl)
  }

  app.on('activate', () => {
    if (mainWindow == null) {
      createMainWindow(appUrl)
    }
  })

  app.on(
    'certificate-error',
    (event, webContents, url, error, certificate, callback) => {
      console.warn('cert error: ', error)
    },
  )
}

ipcMain.on('onSetWsUrl', (e, url) => {
  store.set('wsUrl', url)
  start()
})

start()
