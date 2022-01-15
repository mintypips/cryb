const {upgrades} = require('hardhat')
const {getTreasury, getOwner} = require('./account')
const {Contract, toBase} = require('./utils')
const {duration} = require('./time')

const deployCrybToken = async () => {
  const treasury = await getTreasury()
  const CrybToken = await Contract('MockCrybToken')
  
  return await CrybToken.deploy(
    500, // 5%
    treasury.address
  )
}

const deployCrybCrowdsale = async (
  startTime,
  endTime,
  availebleForSale=toBase('1000'),
  tax=500, //5%
  rate=10, // price per token 0.1 ETH so rate is 1/0.1=10
  vestingDuration=duration.days(10),
  cliff=0
) => {
  const owner = await getOwner()
  const treasury = await getTreasury()
  const CrybToken = await Contract('CrybToken')
  const crybToken =  await CrybToken.deploy(
    tax,
    treasury.address
  )

  const opts = {
    unsafeAllow: ['external-library-linking']
  }

  // deploy vesting
  const Vesting = await Contract('Vesting')
  const vesting = await Vesting.deploy()

  const CrybCrowdsale = await Contract('CrybCrowdsale', {
    libraries: {
      Vesting: vesting.address
    },
    unsafeAllowLinkedLibraries: true
  })

  const crybCrowdsale = await upgrades.deployProxy(CrybCrowdsale, [
    crybToken.address,
    treasury.address,
    rate,
    startTime,
    endTime,
    availebleForSale,
    vestingDuration,
    cliff
  ], opts)

  // exclude owner and crowdsale
  await crybToken.exclude(owner.address)
  await crybToken.exclude(crybCrowdsale.address)

  return [crybCrowdsale, crybToken]
}

module.exports = {
  deployCrybToken,
  deployCrybCrowdsale
}
