const {expect} = require('chai')
const {getParticipants, getOwner, getTreasury} = require('../helpers/account')
const {toBase} = require('../helpers/utils')
const {endOfDay, addDays, fromSolTime} = require('../helpers/time')
const {deployCrybCrowdsale} = require('../helpers/deployer')
const {setNextBlockTimestamp} = require('../helpers/evm')

describe('CrybCrowdsale: withdrawRemaining', () => {
  let crybCrowdsale
  let crybToken
  let owner
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

    owner = await getOwner()
    participants = await getParticipants()

    // fund the crowdsale token contract
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

  it('should be only be called by the owner', async () => {
    await moveToEndTime()

    await expect(
      crybCrowdsale.connect(participants[0]).withdrawRemaining()
    ).to.revertedWith('Ownable: caller is not the owner')
  })

  it('should revert if called before the end of the sale', async () => {

    await expect(
      crybCrowdsale.connect(owner).withdrawRemaining()
    ).to.revertedWith('sale not finished yet')
  })

  it('should send the unsold tokens to the treasury account', async () => {
    await moveToStartTime()

    await crybCrowdsale.connect(participants[0]).buy({value: toBase(30)})
    await crybCrowdsale.connect(participants[1]).buy({value: toBase(30)})
    await crybCrowdsale.connect(participants[2]).buy({value: toBase(30)})

    await moveToEndTime()

    // 900 tokens were sold out of the 1000 available; thus 100 unsold token will be sent to the treasury
    await crybCrowdsale.connect(owner).withdrawRemaining()

    const treasury = await getTreasury()
    expect(await crybToken.balanceOf(treasury.address)).to.equal(toBase(100))
  })
})
