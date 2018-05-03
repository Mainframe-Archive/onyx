const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron')
const { appReady, is } = require('electron-util')
const Store = require('electron-store')
const getPort = require('get-port')
const StaticServer = require('static-server')
const path = require('path')
const querystring = require('querystring')

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

const store = new Store({
  name: is.development ? 'onyx-summit-dev' : 'onyx-summit',
})

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

  const storedWsUrl = store.get('wsUrl')
  if (storedWsUrl) {
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
