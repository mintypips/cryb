const {expect} = require('chai')
const {getParticipants, getTreasury, getBalance, getOwner} = require('../helpers/account')
const {toBase} = require('../helpers/utils')
const {endOfDay, addDays, fromSolTime, toSolTime} = require('../helpers/time')
const {deployCrybCrowdsale} = require('../helpers/deployer')
const {setNextBlockTimestamp} = require('../helpers/evm')

describe.only('CrybCrowdsale: release', () => {
  let crybCrowdsale
  let crybToken
  let startTime
  let endTime
  let participants

  beforeEach(async () => {
    const {timestamp} = await ethers.provider.getBlock()
    const now = new Date(fromSolTime(Number(timestamp)))
    startTime = endOfDay(addDays(1, now))
    endTime = endOfDay(addDays(20, new Date(fromSolTime(startTime))));
    
    ([crybCrowdsale, crybToken] = await deployCrybCrowdsale(
      startTime,
      endTime
      ))
      
    participants = await getParticipants()
      
    // fund the crowdsale token contract
    const owner = await getOwner()
    await crybToken.connect(owner).transfer(crybCrowdsale.address, toBase(1000))
  })

  const moveToStartTime = async () => {
    const startTime = await crybCrowdsale.startTime()
    await setNextBlockTimestamp(Number(startTime))
  }

  const moveToEndTime= async () => {
    const endTime = await crybCrowdsale.endTime()
    await setNextBlockTimestamp(Number(endTime))
  }

  it('should allow user linearly release vested tokens', async () => {
    await moveToStartTime()
    // totally amount ready to be vested is 300
    await crybCrowdsale.connect(participants[0]).buy({value: toBase(30)})
    const vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 0)

    // vesting duration is 10 days
    for (let i = 1; i <= 10; i++) {
      // move one day from the vesting start time
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingInfo.startTime)))))

      // release
      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).release(0)
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      
      // should get 1/10 of the total 300 tokens vested
      expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(30))
    }
  })
})
