const Conf = require('conf')
const path = require('path')

const { onyx } = require('../package.json')

const swarmRootPath = path.join(process.env.HOME, '.onyx-toolbox', 'swarm')
const swarmGitPath = path.join(swarmRootPath, 'go-ethereum')

const conf = new Conf({ configName: 'toolbox' })

const getPath = key => conf.get(`paths.${key}`)

const setPath = (key, value) => conf.set(`paths.${key}`, value)

const setPaths = (paths = {}) =>
  Object.keys(paths).forEach(key => setPath(key, paths[key]))

const resetPaths = () => {
  setPaths({
    geth: {
      bin: path.join(swarmGitPath, 'build', 'bin', 'geth'),
    },
    server: {
      bin: path.resolve(__dirname, '..', 'node_modules', '.bin', 'onyx-server'),
    },
    swarm: {
      bin: path.join(swarmGitPath, 'build', 'bin', 'swarm'),
      data: path.join(swarmRootPath, 'data'),
      git: swarmGitPath,
      pwd: path.join(swarmRootPath, 'pwd'),
      root: swarmRootPath,
    },
  })
}

resetPaths()

module.exports = Object.assign({}, onyx, {
  conf,
  getPath,
  setPath,
  setPaths,
  resetPaths,
})
