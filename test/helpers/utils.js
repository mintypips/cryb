const {ethers} = require('hardhat')

const Contract = async (contractName, factoryOptions) => await ethers.getContractFactory(contractName, factoryOptions)

const toBase = (n, dec=18) => {
  return ethers.BigNumber.from(n).mul(ethers.BigNumber.from(10).pow(dec))
}

module.exports = {
  Contract,
  toBase
}
