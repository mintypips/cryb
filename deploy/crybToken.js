const {ethers, upgrades} = require('hardhat')
const {toBase} = require('../test/helpers')
const {
  deploymentParams: {
    tax,
    treasury
  }
} = require('../.config.json')

const main = async () => {
  const CrybToken = await Contract('CrybToken')
  const crybToken =  await CrybToken.deploy(
    tax,
    treasury
  )

  await crybToken.deployed()
  console.log(`crybToken deployed at: `, crybToken.address);
}

main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error)
  process.exit(1)
})
