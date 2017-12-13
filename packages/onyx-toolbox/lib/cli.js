const meow = require('meow')
const updateNotifier = require('update-notifier')

const { startSwarm, startServer } = require('./api')
const { conf } = require('./config')
const {
  checkEnvironmentTask,
  checkStatus,
  cleanSwarmTask,
  resetSwarmTask,
  setupSwarmTask,
  startSwarmTask,
  stopSwarmTask,
  startServerTask,
  stopServerTask,
} = require('./tasks')

const helpTexts = {
  default: `
  Usage
    onyx <command>

  Commands
    clean - Clean the environment created by the setup
    help <command> - Information and available flags for the specified command
    reset - Reset the environment, same as clean + setup
    setup - Setup the environment
    start - Start the Onyx server
    status - Display the environment and processes status
    stop - Stop the Onyx server
    swarm <action> - Swarm commands
  `,
  clean: `
  Clean the environment, deleting the required files and folders

  Usage
    onyx clean
  `,
  reset: `
  Reset the environment, this is equivalent to running the clean command followed by the setup one

  Usage
    onyx reset
  `,
  setup: `
  Setup the environment by creating the Swarm binaries and account

  Usage
    onyx setup
  `,
  start: `
  Start the Onyx server

  Usage
    onyx start <flags>

  Flags
    --attach, -a - Attach to the Onyx process, useful for debugging using the DEBUG environment variable, ex: DEBUG='onyx*' onyx start --attach
    --port, -p - Server port
    --unsecure, -u - Run the server without TLS
  `,
  status: `
  Display the environment and processes status.

  Usage
    onyx status
  `,
  stop: `
  Stop the Onyx server.

  Running this command will NOT stop the Swarm server, use onyx swarm stop if you need to

  Usage
    onyx stop
  `,
  swarm: `
  Usage
    onyx swarm <action>

  Actions
    start <flags> - Start the Swarm process, run "onyx help swarm start" for information about the flags
    stop - Stop the Swarm process
  `,
  'swarm start': `
  Start the Swarm process

  Usage
    onyx swarm start <flags>

  Flags
    --attach, -a - Attach to the Swarm process, useful for debugging
    --force, -f - Force starting the Swarm process, even if already started
    --wait, -w - Time to wait in milliseconds before considering the process as successfully started, defaults to 2000
  `,
  'swarm stop': `
  Stop the running Swarm process

  Usage
    onyx swarm stop <flags>

  Flags
    --wait, -w - Time to wait in milliseconds before considering the process as successfully stopped, defaults to 2000
  `,
}

const helpCommands = cmd => {
  const text = helpTexts[cmd]
  if (text) {
    console.log(text)
  } else {
    return true
  }
}

const swarmCommands = {
  start: async options =>
    options.attach ? startSwarm(options) : startSwarmTask.run({ options }),
  stop: () => stopSwarmTask.run(),
}

const commands = {
  clean: () => {
    cleanSwarmTask.run()
  },
  help: inputs => helpCommands(inputs.join(' ')),
  reset: () => {
    resetSwarmTask.run()
  },
  setup: () => {
    setupSwarmTask.run()
  },
  start: (inputs, flags = {}) => {
    const options = {
      attach: flags.attach,
      port: flags.port ? parseInt(flags.port, 10) : undefined,
      unsecure: flags.unsecure,
      wait: flags.wait ? parseInt(flags.wait, 10) : false,
    }

    if (flags.attach) {
      return startServer(options)
    } else {
      startServerTask.run({ options })
    }
  },
  status: () => {
    checkStatus()
  },
  stop: () => {
    stopServerTask.run()
  },
  swarm: (inputs, flags = {}) => {
    const cmd = swarmCommands[inputs[0]]
    if (cmd) {
      const options = Object.assign(flags, {
        wait: flags.wait ? parseInt(flags.wait, 10) : false,
      })
      cmd(options)
    } else {
      return true
    }
  },
}

const cli = meow(helpTexts.default, {
  flags: {
    attach: {
      type: 'boolean',
      alias: 'a',
    },
    force: {
      type: 'boolean',
      alias: 'f',
    },
    port: {
      type: 'string',
      alias: 'p',
    },
    unsecure: {
      type: 'boolean',
      alias: 'u',
      default: false,
    },
    wait: {
      type: 'string',
      alias: 'w',
      default: '2000',
    },
  },
})

updateNotifier({ pkg: cli.pkg }).notify()

const [cmdName, ...inputs] = cli.input
const command = commands[cmdName]
if (command) {
  if (command(inputs, cli.flags) === true) {
    cli.showHelp()
  }
} else {
  cli.showHelp()
}
