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
    startTime = [endOfDay(addDays(1, now)), endOfDay(addDays(15, now))]
    endTime = [
      endOfDay(addDays(15, new Date(fromSolTime(startTime[0])))), 
      endOfDay(addDays(20, new Date(fromSolTime(startTime[1]))))
    ];

    ([crybCrowdsale, crybToken] = await deployCrybCrowdsale(
      startTime,
      endTime
    ))

    owner = await getOwner()
    participants = await getParticipants()

    // fund the crowdsale token contract
    await crybToken.connect(owner).transfer(crybCrowdsale.address, toBase(1000))
  })

  const moveToPublicStartTime = async () => {
    const startTime = await crybCrowdsale.startTime(1)
    await setNextBlockTimestamp(Number(startTime))
  }

  const moveToPresaleStartTime = async () => {
    const startTime = await crybCrowdsale.startTime(0)
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

    await moveToPublicStartTime()
    await crybCrowdsale.connect(owner).setAvailableForSale(toBase('1000'))
    await crybCrowdsale.connect(participants[2]).publicSale({value: toBase(30)})

    // 600 tokens were sold out of the 1000 available; thus 400 unsold token will be sent to the treasury
    await crybCrowdsale.connect(owner).withdrawRemaining()

    const treasury = await getTreasury()
    expect(await crybToken.balanceOf(treasury.address)).to.equal(toBase(400))
  })
})
