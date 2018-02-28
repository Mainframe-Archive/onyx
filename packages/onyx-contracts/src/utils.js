// @flow

import { sha3 } from 'web3-utils'

export const callAsync = (method: Object): Promise<*> =>
  new Promise((resolve, reject) => {
    method.call((err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })

export const namehash = (name: string): string => {
  let node =
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  if (name === '') {
    return node
  }

  const labels = name.split('.')
  for (let i = labels.length - 1; i >= 0; i--) {
    node = sha3(node + sha3(labels[i]).slice(2), { encoding: 'hex' })
  }
  return node.toString()
}
