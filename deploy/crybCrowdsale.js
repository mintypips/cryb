const {ethers, upgrades} = require('hardhat')
const {toBase, Contract} = require('../test/helpers/utils')
const {
  deploymentParams: {
    crybToken,
    treasury,
    rate,
    startTime,
    endTime,
    availebleForSale,
    vestingDuration,
    cliff
  }
} = require('../.config.json')

const main = async () => {
  const [owner] = await ethers.getSigners()
 
  const Vesting = await Contract('Vesting')
  const vesting = await Vesting.deploy()

  await vesting.deployed()
  console.log('Vesting deployed at: ', vesting.address)

  const CrybCrowdsale = await Contract('CrybCrowdsale', {
    libraries: {
      Vesting: vesting.address
    },
    unsafeAllowLinkedLibraries: true
  })

  const params = [
    crybToken,
    treasury,
    rate,
    startTime,
    endTime,
    toBase(availebleForSale),
    vestingDuration,
    cliff
  ]

  const crybCrowdsale = await upgrades.deployProxy(
    CrybCrowdsale,
    params,
    {
      kind: 'uups',
      from: owner.address,
      log: true,
      unsafeAllow: ['external-library-linking']
    }
  )

  await crybCrowdsale.deployed()
  console.log(`crybCrowdsale deployed at: `, crybCrowdsale.address);
}

main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error)
  process.exit(1)
})
