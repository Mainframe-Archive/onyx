// @flow

const electron = window.require('electron')
const ipc = electron.ipcRenderer

export const onSetWsUrl = (url) => {
  ipc.send('onSetWsUrl', url)
}
