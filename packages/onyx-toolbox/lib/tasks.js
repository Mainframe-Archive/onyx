const execa = require('execa')
const { ensureDir, pathExists } = require('fs-extra')
const Listr = require('listr')
const symbols = require('log-symbols')
const ora = require('ora')

const {
  buildBin,
  checkGit,
  checkGo,
  cleanSwarm,
  createAccount,
  createPassword,
  getServerStatus,
  getSwarmStatus,
  gitClone,
  gitFetch,
  isSetup,
  startSwarm,
  stopSwarm,
  startServer,
  stopServer,
} = require('./api')
const { conf, getPath } = require('./config')

const checkEnvironmentTask = new Listr(
  [
    {
      title: 'Git is available',
      task: async () => {
        if ((await checkGit()) === false) {
          throw new Error(
            'git is not available - please install it first: https://git-scm.com/',
          )
        }
      },
    },
    {
      title: 'Go is available',
      task: async () => {
        if ((await checkGo()) === false) {
          throw new Error(
            'Go is not available - please install it: https://golang.org/doc/install',
          )
        }
      },
    },
  ],
  { concurrent: true },
)

const setupSwarmTask = new Listr([
  {
    title: 'Check environment dependencies',
    task: () => checkEnvironmentTask,
  },
  {
    title: 'Check working directory',
    task: () => ensureDir(getPath('swarm.root')),
  },
  {
    title: 'Clone MainframeHQ/go-ethereum',
    task: () => gitClone(getPath('swarm.root')),
    skip: async () => {
      if (await pathExists(getPath('swarm.git'))) {
        return 'Repository already exists'
      }
      return false
    },
  },
  {
    title: 'Fetch latest update',
    task: async ctx => {
      ctx.forceBuild = await gitFetch(getPath('swarm.git'))
    },
  },
  {
    title: 'Build geth',
    task: () => buildBin(getPath('swarm.git'), 'geth'),
    skip: async ctx => {
      if (ctx.forceBuild) {
        return false
      }
      if (await pathExists(getPath('geth.bin'))) {
        return 'geth binary already exists'
      }
      return false
    },
  },
  {
    title: 'Build swarm',
    task: () => buildBin(getPath('swarm.git'), 'swarm'),
    skip: async ctx => {
      if (ctx.forceBuild) {
        return false
      }
      if (await pathExists(getPath('swarm.bin'))) {
        return 'swarm binary already exists'
      }
      return false
    },
  },
  {
    title: 'Check data directory',
    task: () => ensureDir(getPath('swarm.data')),
  },
  {
    title: 'Create password file',
    task: () => createPassword(),
    skip: async () => {
      if (await pathExists(getPath('swarm.pwd'))) {
        return 'Password file is already created'
      }
      return false
    },
  },
  {
    title: 'Create account',
    task: async (ctx, task) => {
      const account = await createAccount()
      conf.set('account', account)
      task.title = `Created account: ${account}`
    },
    skip: () => {
      const account = conf.get('account')
      return account ? `Use already created account: ${account}` : false
    },
  },
  {
    title: 'Save configuration',
    task: () => {
      conf.set('setup', true)
    },
  },
])

const startSwarmTask = new Listr([
  {
    title: 'Setup Swarm environment',
    task: () => setupSwarmTask,
    skip: () =>
      conf.has('setup') ? 'Swarm environment is already set up' : false,
  },
  {
    title: 'Start Swarm',
    task: async (ctx, task) => {
      const pid = await startSwarm(ctx.options)
      if (pid) {
        task.title = `Swarm started with pid ${pid}`
      } else {
        throw new Error(
          'Failed to start Swarm node, try adding the --attach flag to see the logs',
        )
      }
    },
    skip: () => {
      const swarm = getSwarmStatus()
      return swarm ? `Swarm is already started with pid ${swarm.pid}` : false
    },
  },
])

const stopServerTask = new Listr([
  {
    title: 'Stop the Onyx server',
    task: async (ctx, task) => {
      await stopServer()
      task.title = 'Onyx server stopped'
    },
    skip: () =>
      conf.has('server') ? false : 'The Onyx server is already stopped',
  },
])

const stopSwarmTask = new Listr([
  {
    title: 'Stop the Onyx server',
    task: () => stopServerTask,
  },
  {
    title: 'Stop Swarm server',
    task: (ctx, task) => {
      stopSwarm()
      task.title = 'Swarm server stopped'
    },
    skip: () => (conf.has('swarmPid') ? false : 'Swarm is not running'),
  },
])

const cleanSwarmTask = new Listr([
  {
    title: 'Stop Swarm server',
    task: () => stopSwarmTask,
  },
  {
    title: 'Clean existing environment',
    task: () => cleanSwarm(),
  },
])

const resetSwarmTask = new Listr([
  {
    title: 'Clean existing environment',
    task: () => cleanSwarmTask,
  },
  {
    title: 'Setup environment',
    task: () => setupSwarmTask,
  },
])

const startServerTask = new Listr([
  {
    title: 'Start Swarm',
    task: () => startSwarmTask,
  },
  {
    title: 'Start the Onyx server',
    task: async (ctx, task) => {
      const server = await startServer(ctx.options)
      if (server) {
        task.title = `Onyx server started on ws://localhost:${
          server.port
        }/graphql with pid ${server.pid}`
      } else {
        throw new Error(
          'Failed to start the Onyx server, try adding the --attach flag and setting the DEBUG environment variable to see the logs',
        )
      }
    },
    skip: () => {
      const server = getServerStatus()
      return server
        ? `Onyx server already started on ws://localhost:${
            server.port
          }/graphql with pid ${server.pid}`
        : false
    },
  },
])

const checkStatus = () => {
  const spinner = ora('Checking Onyx server...').start()

  const server = getServerStatus()
  if (server) {
    spinner.succeed(
      `Onyx server running on port ${server.port} with pid ${server.pid}`,
    )
    return
  }

  spinner.stopAndPersist({
    symbol: symbols.warning,
    text: 'The Onyx server is not running',
  })

  const swarm = getSwarmStatus()
  if (swarm) {
    spinner.succeed(`Swarm process is running with pid ${swarm.pid}`)
    return
  }

  spinner.stopAndPersist({
    symbol: symbols.warning,
    text: 'The Swarm process is not running',
  })

  if (isSetup()) {
    spinner.succeed('The environment is setup')
  } else {
    spinner.warn('The environment is not setup')
  }
}

module.exports = {
  checkStatus,
  checkEnvironmentTask,
  setupSwarmTask,
  startSwarmTask,
  stopSwarmTask,
  cleanSwarmTask,
  resetSwarmTask,
  startServerTask,
  stopServerTask,
}
