const { binFlags } = require('./config')

const buildFlags = (name, flags = {}) => {
  const baseFlags = binFlags[name] || {}
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

const killProcess = (pid, signal) => {
  try {
    process.kill(pid, signal)
    return true
  } catch (err) {
    return false
  }
}

const processIsRunning = pid => killProcess(pid, 0)

const sleep = time => new Promise(resolve => setTimeout(resolve, time))

module.exports = { buildFlags, killProcess, processIsRunning, sleep }
