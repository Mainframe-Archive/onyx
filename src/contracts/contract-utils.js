// flow
import Web3Utils from 'web3-utils'

export const namehash = (name: string) => {
  var node = '0x0000000000000000000000000000000000000000000000000000000000000000'
  if (name !== '') {
    var labels = name.split('.')
    for(var i = labels.length - 1; i >= 0; i--) {
      node = Web3Utils.sha3(node + Web3Utils.sha3(labels[i]).slice(2), {encoding: 'hex'})
    }
  }
  return node.toString()
}
