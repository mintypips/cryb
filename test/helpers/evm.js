const {network} = require('hardhat')

const mineBlocks = async count => {
  const promises = []

  for(let i = 0 ; i < count ; i++) {
    promises.push(network.provider.send('evm_mine', []))
  }

  return await Promise.all(promises)
}

const setNextBlockTimestamp = async ts => {
  await network.provider.send("evm_setNextBlockTimestamp", [ts])
}

module.exports = {
  mineBlocks,
  setNextBlockTimestamp
}
