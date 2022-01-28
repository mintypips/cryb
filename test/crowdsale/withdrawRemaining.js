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
  let vestingStartDate
  let participants

  beforeEach(async () => {
    const {timestamp} = await ethers.provider.getBlock()
    const now = new Date(fromSolTime(Number(timestamp)))
    startTime = [endOfDay(addDays(1, now)), endOfDay(addDays(15, now))]
    startTime = endOfDay(addDays(1, now))
    endTime = endOfDay(addDays(20, now))
    vestingStartDate = endOfDay(addDays(30, now));

    ([crybCrowdsale, crybToken] = await deployCrybCrowdsale(
      startTime,
      endTime,
      vestingStartDate
    ))

    owner = await getOwner()
    participants = await getParticipants()

    // fund the crowdsale token contract
    await crybToken.connect(owner).transfer(crybCrowdsale.address, toBase(1000))
  })

  const moveToPresaleStartTime = async () => {
    const startTime = await crybCrowdsale.startTime()
    await setNextBlockTimestamp(Number(startTime))
  }

  it('should be only be called by the owner', async () => {
    await expect(
      crybCrowdsale.connect(participants[0]).withdrawRemaining()
    ).to.revertedWith('Ownable: caller is not the owner')
  })


  it('should send the unsold tokens to the treasury account', async () => {
    await moveToPresaleStartTime()

    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(10)})
    await crybCrowdsale.connect(participants[1]).preSale({value: toBase(20)})

    // 300 tokens were sold out of the 500 available; thus 200 unsold token will be sent to the treasury
    await crybCrowdsale.connect(owner).withdrawRemaining()

    const treasury = await getTreasury()
    expect(await crybToken.balanceOf(treasury.address)).to.equal(toBase(200))
  })
})
