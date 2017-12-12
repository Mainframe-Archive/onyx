const Conf = require('conf')
const path = require('path')

const { onyx } = require('../package.json')

const conf = new Conf({ configName: 'toolbox' })

const baseDirPath = path.join(process.env.HOME, '.onyx-toolbox')
const swarmDirPath = path.join(baseDirPath, 'swarm')
const swarmDataPath = path.join(swarmDirPath, 'data')
const swarmPwdPath = path.join(swarmDirPath, 'pwd')
const swarmGitPath = path.join(swarmDirPath, 'go-ethereum')
const swarmBinPath = path.join(swarmGitPath, 'build', 'bin', 'swarm')
const gethBinPath = path.join(swarmGitPath, 'build', 'bin', 'geth')
const serverBinPath = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  'onyx-server',
)

module.exports = Object.assign({}, onyx, {
  conf,
  baseDirPath,
  swarmDirPath,
  swarmDataPath,
  swarmPwdPath,
  swarmGitPath,
  swarmBinPath,
  gethBinPath,
  serverBinPath,
})
