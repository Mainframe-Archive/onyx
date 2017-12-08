const chalk = require('chalk')
const meow = require('meow')
const ora = require('ora')
const updateNotifier = require('update-notifier')

const {
  conf,
  cleanSwarm,
  resetSwarm,
  setupSwarm,
  startSwarm,
  stopSwarm,
} = require('.')

const helpTexts = {
  setup: `
  Setup the environment by creating the Swarm binaries and account

  Usage
    onyx setup
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
  start: async options => {
    if (!conf.has('account')) {
      await setupSwarm.run()
    }
    if (options.attach) {
      return startSwarm(options)
    }

    const spinner = ora('Starting Swarm server...').start()
    const pid = await startSwarm(options)
    if (pid) {
      spinner.succeed(`Swarm started with pid ${chalk.cyan(pid)}`)
    } else {
      spinner.fail(
        `${chalk.red(
          'Failed',
        )} to start Swarm node, try adding the --attach flag to see the logs`,
      )
    }
  },
  stop: options => {
    const spinner = ora('Stopping Swarm server...').start()
    const pid = stopSwarm(options)
    if (pid === true) {
      spinner.succeed('Swarm stopped')
    } else if (pid) {
      spinner.fail(
        `${chalk.red('Error')} trying to stop Swarm: invalid pid ${chalk.cyan(
          pid,
        )}`,
      )
    } else {
      spinner.warn(
        `${chalk.yellow(
          'Warning:',
        )} no Swarm pid stored, the process might be already stopped, or not managed by onyx-toolbox`,
      )
    }
  },
}

const commands = {
  clean: async () => {
    const spinner = ora('Cleaning workspace...').start()
    await cleanSwarm()
    spinner.succeed('Workspace cleaned-up')
  },
  help: inputs => helpCommands(inputs.join(' ')),
  setup: async () => {
    await setupSwarm.run()
    console.log('🎉  Environment is setup!')
  },
  swarm: (inputs, flags = {}) => {
    const cmd = swarmCommands[inputs[0]]
    if (cmd) {
      cmd({
        ...flags,
        wait: flags.wait ? parseInt(flags.wait) : false,
      })
    } else {
      return true
    }
  },
}

const cli = meow(
  `
  Usage
    onyx <command>

  Commands
    help <command> - Information and available flags for the specified command
    setup - Setup the environment
    swarm <action> - Swarm commands
  `,
  {
    flags: {
      attach: {
        type: 'boolean',
        alias: 'a',
      },
      force: {
        type: 'boolean',
        alias: 'f',
      },
      wait: {
        type: 'string',
        alias: 'w',
        default: '2000',
      },
    },
  },
)

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
