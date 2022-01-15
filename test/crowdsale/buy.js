const {expect} = require('chai')
const {getParticipants} = require('../helpers/account')
const {toBase, execAndGetTransferAmount} = require('../helpers/utils')
const {duration, endOfDay, addDays, fromSolTime} = require('../helpers/time')
const {deployCrybCrowdsale} = require('../helpers/deployer')
const {setNextBlockTimestamp} = require('../helpers/evm')

describe.only('CrybCrowdsale: buy', () => {
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

  it('should revert if sale has not started', async () => {
    await expect(
      crybCrowdsale.connect(participants[0]).buy({value: toBase(1, 17)}) //0.1
    ).to.revertedWith('sale not started')
  })

  it('should revert if sale has ended', async () => {
    await moveToEndTime()

    await expect(
      crybCrowdsale.connect(participants[0]).buy({value: toBase(1, 17)}) //0.1
    ).to.revertedWith('sale ended')
  })

  it('should revert if send 0 ETH', async () => {
    await moveToStartTime()

    await expect(
      crybCrowdsale.connect(participants[0]).buy({value: 0})
    ).to.revertedWith('cannot accept 0')
  })
})
