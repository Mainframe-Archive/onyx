const { spawn } = require('child_process')
const Conf = require('conf')
const { remove } = require('fs-extra')
const getPort = require('get-port')
const execa = require('execa')
const createServer = require('onyx-server').default

const {
  gitTag,
  conf,
  gethBinPath,
  serverBinPath,
  swarmBinPath,
  swarmDataPath,
  swarmDirPath,
  swarmPwdPath,
} = require('./config')
const { buildFlags, killProcess, processIsRunning, sleep } = require('./utils')

const checkGit = async () => {
  try {
    await execa('git', ['version'])
    return true
  } catch (err) {
    return false
  }
}

const checkGo = async () => {
  try {
    await execa('go', ['version'])
    return true
  } catch (err) {
    return false
  }
}

const gitClone = cwd =>
  execa.stdout(
    'git',
    [
      'clone',
      '--branch',
      gitTag,
      '--depth',
      1,
      'https://github.com/MainframeHQ/go-ethereum.git',
    ],
    { cwd },
  )

const gitFetch = async cwd => {
  const options = { cwd }
  const fetchOut = await execa.stdout('git', ['fetch'], options)
  await execa('git', ['checkout', gitTag], options)
  return fetchOut !== ''
}

const buildBin = (cwd, name) =>
  execa.stdout(
    'build/env.sh',
    ['go', 'run', 'build/ci.go', 'install', `./cmd/${name}`],
    { cwd },
  )

const createAccount = async () => {
  const res = await execa.stdout(gethBinPath, [
    '--datadir',
    swarmDataPath,
    '--password',
    swarmPwdPath,
    'account',
    'new',
  ])
  return res.slice(10, -1)
}

const startSwarmProc = attach => {
  const proc = spawn(
    swarmBinPath,
    buildFlags('swarm', {
      datadir: swarmDataPath,
      password: swarmPwdPath,
      bzzaccount: conf.get('account'),
    }),
    attach ? { stdio: 'inherit' } : { detached: true, stdio: 'ignore' },
  )
  if (!attach) {
    proc.unref()
  }
  return proc.pid
}

const startSwarm = async (options = {}) => {
  let pid = conf.get('swarmPid')

  if (pid == null || !processIsRunning(pid) || options.force) {
    pid = startSwarmProc(options.attach)
    conf.set('swarmPid', pid)
    if (options.wait) {
      await sleep(options.wait)
    }
  }

  return processIsRunning(pid) ? pid : false
}

const stopSwarm = () => {
  const pid = conf.get('swarmPid')
  if (pid == null) {
    return false
  }

  conf.delete('swarmPid')
  if (killProcess(pid)) {
    return true
  }

  return pid
}

const cleanSwarm = () => {
  conf.store = {}
  return remove(swarmDirPath)
}

const startServerProc = (options = {}) => {
  const proc = spawn(
    serverBinPath,
    buildFlags('server', {
      port: options.port == null ? false : options.port,
      unsecure: !!options.unsecure,
    }),
    options.attach ? { stdio: 'inherit' } : { detached: true, stdio: 'ignore' },
  )
  if (!options.attach) {
    proc.unref()
  }
  return proc.pid
}

const startServer = async (options = {}) => {
  if (options.port == null) {
    options.port = await getPort({ port: 5000 })
  }

  if (options.attach) {
    return startServerProc(options)
  }

  const pid = await startServerProc(options)
  if (options.wait) {
    await sleep(options.wait)
  }

  if (processIsRunning(pid)) {
    const server = { pid, port: options.port }
    conf.set('server', server)
    return server
  }

  return false
}

const stopServer = async () => {
  const server = conf.get('server')
  if (server == null) {
    return false
  }

  conf.delete('server')
  if (killProcess(server.pid)) {
    return true
  }

  return server.pid
}

module.exports = {
  checkGit,
  checkGo,
  gitClone,
  gitFetch,
  buildBin,
  createAccount,
  startSwarm,
  stopSwarm,
  cleanSwarm,
  startServer,
  stopServer,
}
