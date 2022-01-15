const {expect} = require('chai')
const {getParticipants} = require('../helpers/account')
const {toBase} = require('../helpers/utils')
const {endOfDay, addDays, fromSolTime} = require('../helpers/time')
const {deployCrybCrowdsale} = require('../helpers/deployer')
const {setNextBlockTimestamp} = require('../helpers/evm')

describe.only('CrybCrowdsale: withdrawRemaining', () => {
  let crybCrowdsale
  let startTime
  let endTime
  let participants

  beforeEach(async () => {
    const {timestamp} = await ethers.provider.getBlock()
    const now = new Date(fromSolTime(Number(timestamp)))
    startTime = endOfDay(addDays(1, now))
    endTime = endOfDay(addDays(20, new Date(fromSolTime(startTime))));

    ([crybCrowdsale] = await deployCrybCrowdsale(
      startTime,
      endTime
    ))

    participants = await getParticipants()
  })

  const moveToStartTime = async () => {
    const startTime = await crybCrowdsale.startTime()
    await setNextBlockTimestamp(Number(startTime))
  }

  const moveToEndTime= async () => {
    const endTime = await crybCrowdsale.endTime()
    await setNextBlockTimestamp(Number(endTime))
  }

  it('should be only be called by the owner', async () => {
    await moveToEndTime()

    await expect(
      crybCrowdsale.connect(participants[0]).withdrawRemaining()
    ).to.revertedWith('Ownable: caller is not the owner')
  })

  it('should revert if called before the end of the sale', async () => {

    await expect(
      crybCrowdsale.withdrawRemaining()
    ).to.revertedWith('sale not finished yet')
  })
})
