// @flow

import { AppRegistry } from 'react-native-web'

import './index.css'
import Onyx from './Onyx'

document.addEventListener('dragover', event => event.preventDefault())
document.addEventListener('drop', event => event.preventDefault())

AppRegistry.registerComponent('Onyx', () => Onyx)
AppRegistry.runApplication('Onyx', {
  rootTag: document.getElementById('root'),
})
