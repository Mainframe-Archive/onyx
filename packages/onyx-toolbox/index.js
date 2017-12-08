const { spawn } = require('child_process')
const Conf = require('conf')
const execa = require('execa')
const { ensureDir, pathExists, remove, writeFile } = require('fs-extra')
const Listr = require('listr')
const path = require('path')

const { binflags } = require('./package.json')

// Toolbox setup

const conf = new Conf()
const baseDirPath = path.join(process.env.HOME, '.onyx-toolbox')

// Utils

const buildFlags = (name, flags = {}) => {
  const baseFlags = binflags[name] || {}
  const allFlags = Object.assign({}, baseFlags, flags)
  return Object.keys(allFlags).reduce((acc, key) => {
    const arg = `--${key}`
    const value = allFlags[key]
    if (value === true) {
      acc.push(arg)
    } else if (value !== false) {
      acc.push(arg, value)
    }
    return acc
  }, [])
}

const sleep = time => new Promise(resolve => setTimeout(resolve, time))

const killProcess = (pid, signal) => {
  try {
    process.kill(pid, signal)
    return true
  } catch (err) {
    return false
  }
}

const processIsRunning = pid => killProcess(pid, 0)

// Env

const checkGit = async () => {
  try {
    await execa('git', ['version'])
    return true
  } catch (err) {
    return false
  }
}

const getGoRoot = async () => {
  try {
    const shell = await execa.shell('echo $GOROOT')
    return shell.stdout
  } catch (err) {
    return ''
  }
}

const checkEnvironment = new Listr(
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
      title: '$GOROOT is set',
      task: async () => {
        if ((await getGoRoot()) === '') {
          throw new Error(
            '$GOROOT is not set - please install Go: https://golang.org/doc/install',
          )
        }
      },
    },
  ],
  { concurrent: true },
)

// Swarm

const swarmDirPath = path.join(baseDirPath, 'swarm')
const swarmDataPath = path.join(swarmDirPath, 'data')
const swarmPwdPath = path.join(swarmDirPath, 'pwd')
const swarmGitPath = path.join(swarmDirPath, 'go-ethereum')
const swarmBinPath = path.join(swarmGitPath, 'build', 'bin', 'swarm')
const gethBinPath = path.join(swarmGitPath, 'build', 'bin', 'geth')

const setupSwarm = new Listr([
  {
    title: 'Check environment dependencies',
    task: () => checkEnvironment,
  },
  {
    title: 'Check working directory',
    task: () => ensureDir(swarmDirPath),
  },
  {
    title: 'Clone go-ethereum',
    task: () =>
      execa.stdout(
        'git',
        ['clone', 'https://github.com/MainframeHQ/go-ethereum.git'],
        { cwd: swarmDirPath },
      ),
    skip: () => pathExists(swarmGitPath),
  },
  {
    title: 'Fetch latest update',
    task: async ctx => {
      const options = { cwd: swarmGitPath }
      const fetchOut = await execa.stdout('git', ['fetch'], options)
      ctx.forceBuild = fetchOut !== ''
      await execa('git', ['checkout', 'onyx-0.1'], options)
    },
  },
  {
    title: 'Build geth',
    task: () =>
      execa.stdout(
        'build/env.sh',
        ['go', 'run', 'build/ci.go', 'install', './cmd/geth'],
        { cwd: swarmGitPath },
      ),
    skip: ctx => !ctx.forceBuild && pathExists(gethBinPath),
  },
  {
    title: 'Build swarm',
    task: () =>
      execa(
        'build/env.sh',
        ['go', 'run', 'build/ci.go', 'install', './cmd/swarm'],
        { cwd: swarmGitPath },
      ),
    skip: ctx => !ctx.forceBuild && pathExists(swarmBinPath),
  },
  {
    title: 'Check data directory',
    task: () => ensureDir(swarmDataPath),
  },
  {
    title: 'Create password file',
    task: () => writeFile(swarmPwdPath, 'onyx'),
    skip: () => pathExists(swarmPwdPath),
  },
  {
    title: 'Create account',
    task: async () => {
      const res = await execa(gethBinPath, [
        '--datadir',
        swarmDataPath,
        '--password',
        swarmPwdPath,
        'account',
        'new',
      ])
      conf.set('account', res.stdout.slice(10, -1))
    },
    skip: () => conf.has('account'),
  },
])

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
    if (options.wait) await sleep(options.wait)
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
  stopSwarm()
  conf.store = {}
  return remove(swarmDirPath)
}

const resetSwarm = async () => {
  await cleanSwarm()
  return setupSwarm.run()
}

// Exports

module.exports = {
  conf,
  cleanSwarm,
  resetSwarm,
  setupSwarm,
  startSwarm,
  stopSwarm,
}
