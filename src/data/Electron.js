// @flow

const electron = window.require('electron')
const ipc = electron.ipcRenderer

export const restart = () => {
  ipc.send('restart')
}
