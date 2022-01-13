const {ethers} = require('hardhat')

const getOwner = async () => {
  const [owner] = await ethers.getSigners()
  return owner
}

const getTreasury = async () => {
  const accounts = await ethers.getSigners()
  return accounts[1]
}

const getAlice = async () => {
  const accounts = await ethers.getSigners()
  return accounts[5]
}

const getBob = async () => {
  const accounts = await ethers.getSigners()
  return accounts[6]
}

module.exports = {
  getOwner,
  getTreasury,
  getAlice,
  getBob
}
