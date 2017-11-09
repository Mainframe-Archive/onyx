// @flow

import { AppRegistry } from 'react-native-web'

import './index.css'
import Demo from './DevConDemo'

document.addEventListener('dragover', event => event.preventDefault())
document.addEventListener('drop', event => event.preventDefault())

AppRegistry.registerComponent('DevConDemo', () => Demo)
AppRegistry.runApplication('DevConDemo', {
  rootTag: document.getElementById('root'),
})
