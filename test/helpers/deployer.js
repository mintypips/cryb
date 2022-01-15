const {upgrades} = require('hardhat')
const {getTreasury} = require('./accounts')
const {Contract} = require('./utils')
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
  tax=500, //5%
  rate=10, // price per token 0.1 ETH
  startTs,
  endTs,
  vestingDuration=duration.days(10),
  cliff=0
) => {
  const treasury = await getTreasury()
  const CrybToken = await Contract('CrybToken')

  const crybToken =  await CrybToken.deploy(
    tax,
    treasury.address
  )

  const CrybCrowdsale = await Contract('CrybCrowdsale')
  const crybCrowdsale = await upgrades.deployProxy(CrybCrowdsale, [
    crybToken.address,
    treasury.address,
    startTs,
    endTs,
    vestingDuration,
    cliff
  ])

  return [crybToken, crybCrowdsale]
}

module.exports = {
  deployCrybToken,
  deployCrybCrowdsale
}
