const {ethers} = require('hardhat')

const Contract = async contractName => await ethers.getContractFactory(contractName)

const toBase = (n, dec=18) => {
  return ethers.BigNumber.from(n).mul(ethers.BigNumber.from(10).pow(dec))
}

module.exports = {
  Contract,
  toBase
}
