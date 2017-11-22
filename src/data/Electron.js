// @flow

const electron = window.require('electron')
const ipc = electron.ipcRenderer

export const onSetServerUrl = (url) => {
  ipc.send('onSetServerUrl', url)
}
