const {expect} = require('chai')
const {getParticipants, getTreasury, getBalance, getOwner} = require('../helpers/account')
const {toBase} = require('../helpers/utils')
const {endOfDay, addDays, fromSolTime} = require('../helpers/time')
const {deployCrybCrowdsale} = require('../helpers/deployer')
const {setNextBlockTimestamp} = require('../helpers/evm')

describe('CrybCrowdsale: preSale', () => {
  let crybCrowdsale
  let crybToken
  let startTime
  let endTime
  let vestingStartDate
  let participants

  beforeEach(async () => {
    const {timestamp} = await ethers.provider.getBlock()
    const now = new Date(fromSolTime(Number(timestamp)))
    startTime = endOfDay(addDays(1, now))
    endTime = endOfDay(addDays(10, now))
    vestingStartDate = endOfDay(addDays(15, now));

    ([crybCrowdsale, crybToken] = await deployCrybCrowdsale(
      startTime,
      endTime,
      vestingStartDate
    ))

    participants = await getParticipants()

    // fund the crowdsale token contract
    const owner = await getOwner()
    await crybToken.connect(owner).transfer(crybCrowdsale.address, toBase(1000))
  })

  const moveToPresaleStartTime = async () => {
    const startTime = await crybCrowdsale.startTime()
    await setNextBlockTimestamp(Number(startTime))
  }

  const moveToPresaleEndTime = async () => {
    const endTime = await crybCrowdsale.endTime()
    await setNextBlockTimestamp(Number(endTime))
  }

  it('should revert if sale has not started', async () => {
    await expect(
      crybCrowdsale.connect(participants[0]).preSale({value: toBase(1, 17)}) //0.1
    ).to.revertedWith('presale not started')
  })

  it('should revert if sale has ended', async () => {
    await moveToPresaleEndTime()

    await expect(
      crybCrowdsale.connect(participants[0]).preSale({value: toBase(1, 17)}) //0.1
    ).to.revertedWith('presale ended')
  })

  it('should revert if send 0 ETH', async () => {
    await moveToPresaleStartTime()

    await expect(
      crybCrowdsale.connect(participants[0]).preSale({value: 0})
    ).to.revertedWith('cannot accept 0')
  })

  it('should revert if sold out', async () => {
    await moveToPresaleStartTime()

    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(20)}) // 20 ETH will buy 200 tokens
    await crybCrowdsale.connect(participants[1]).preSale({value: toBase(10)}) // 10 ETH will buy 100 tokens
    await crybCrowdsale.connect(participants[2]).preSale({value: toBase(10)}) // 10 ETH will buy 100 tokens
    await crybCrowdsale.connect(participants[3]).preSale({value: toBase(10)}) // 10 ETH will buy 100 tokens

    // 1000 has been already sold which is the total available for sale
    await expect(
      crybCrowdsale.connect(participants[0]).preSale({value: 1}) // even the tiniest amount should make it fail
    ).to.revertedWith('sold out')
  })

  it('should revert if personal max allocation is reached', async () => {
    await moveToPresaleStartTime()

    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(10)}) // 10 ETH will buy 100 tokens
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(5)}) // 5 ETH will buy 50 tokens
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(5)}) // 5 ETH will buy 50 tokens

    // at this point user has purchased 200 tokens in three contributions so no more is allowed
    await expect(
      crybCrowdsale.connect(participants[0]).preSale({value: 1}) // even the tiniest amount should make it fail
    ).to.revertedWith('max allocation violation')
  })

  it('should increase the totalRaised value', async () => {
    await moveToPresaleStartTime()
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(20)})
    let totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(20))

    await crybCrowdsale.connect(participants[1]).preSale({value: toBase(10)})
    totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(30))

    await crybCrowdsale.connect(participants[2]).preSale({value: toBase(10)})
    totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(40))

    await crybCrowdsale.connect(participants[3]).preSale({value: toBase(10)})
    totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(50))
  })

  it('should increase the totalSold value', async () => {
    await moveToPresaleStartTime()

    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(20)})
    let totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(200))

    await crybCrowdsale.connect(participants[1]).preSale({value: toBase(10)})
    totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(300))

    await crybCrowdsale.connect(participants[2]).preSale({value: toBase(10)})
    totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(400))

    await crybCrowdsale.connect(participants[3]).preSale({value: toBase(10)})
    totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(500))
  })

  it('should transfer ETH to the treasury account', async () => {
    await moveToPresaleStartTime()

    const treasury = await getTreasury()

    let treasuryBalanceBefore = await getBalance(treasury.address)

    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(20)})
    let treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(20))

    await crybCrowdsale.connect(participants[1]).preSale({value: toBase(10)})
    treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(30))

    await crybCrowdsale.connect(participants[2]).preSale({value: toBase(10)})
    treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(40))

    // started with x balance ended with x + 100 balance received from the crowdsale
    await crybCrowdsale.connect(participants[3]).preSale({value: toBase(10)})
    treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(50))
  })

  it('should not transfer the tokens to the buyer', async () => {
    await moveToPresaleStartTime()
    
    let balanceBefore = await crybToken.balanceOf(participants[0].address)
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(10)})
    let balanceAfter = await crybToken.balanceOf(participants[0].address)
    expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(0))

    // same user
    balanceBefore = await crybToken.balanceOf(participants[0].address)
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(10)})
    balanceAfter = await crybToken.balanceOf(participants[0].address)
    expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(0))

    // another user
    balanceBefore = await crybToken.balanceOf(participants[1].address)
    await crybCrowdsale.connect(participants[1]).preSale({value: toBase(15)})
    balanceAfter = await crybToken.balanceOf(participants[1].address)
    expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(0))
  })

  it('should create a new vesting position for the given users', async () => {
    await moveToPresaleStartTime()
    
    let {blockNumber} = await crybCrowdsale.connect(participants[0]).preSale({value: toBase(20)})
    let {timestamp} = await ethers.provider.getBlock(blockNumber)
    let vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 0)
    expect(vestingInfo.amount).to.equal(toBase(200))
    expect(vestingInfo.totalClaimed).to.equal(0)
    expect(vestingInfo.periodClaimed).to.equal(0);

    ({blockNumber} = await crybCrowdsale.connect(participants[1]).preSale({value: toBase(10)}));
    ({timestamp} = await ethers.provider.getBlock(blockNumber));
    (vestingInfo = await crybCrowdsale.getVestingInfo(participants[1].address, 0));
    expect(vestingInfo.amount).to.equal(toBase(100))
    expect(vestingInfo.totalClaimed).to.equal(0)
    expect(vestingInfo.periodClaimed).to.equal(0)
  })

  it('should allow the same user have multiple vesting positions', async () => {
    await moveToPresaleStartTime()
    
    let {blockNumber} = await crybCrowdsale.connect(participants[0]).preSale({value: toBase(10)})
    let {timestamp} = await ethers.provider.getBlock(blockNumber)
    let vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 0)
    expect(vestingInfo.amount).to.equal(toBase(100))
    expect(vestingInfo.totalClaimed).to.equal(0)
    expect(vestingInfo.periodClaimed).to.equal(0);

    // second position
    ({blockNumber} = await crybCrowdsale.connect(participants[0]).preSale({value: toBase(5)}));
    ({timestamp} = await ethers.provider.getBlock(blockNumber));
    (vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 1));
    expect(vestingInfo.amount).to.equal(toBase(50))
    expect(vestingInfo.totalClaimed).to.equal(0)
    expect(vestingInfo.periodClaimed).to.equal(0);

    // third position
    ({blockNumber} = await crybCrowdsale.connect(participants[0]).preSale({value: toBase(5)}));
    ({timestamp} = await ethers.provider.getBlock(blockNumber));
    (vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 2));
    expect(vestingInfo.amount).to.equal(toBase(50))
    expect(vestingInfo.totalClaimed).to.equal(0)
    expect(vestingInfo.periodClaimed).to.equal(0)
  })

  it('should update the vesting count for each user', async () => {
    await moveToPresaleStartTime()

    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(10)})
    let vestingCount0 = await crybCrowdsale.vestingCount(participants[0].address)
    expect(vestingCount0).to.equal(1)

    // second vesting position for user 0
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(5)})
    vestingCount0 = await crybCrowdsale.vestingCount(participants[0].address)
    expect(vestingCount0).to.equal(2)

    // first position for user 1
    await crybCrowdsale.connect(participants[1]).preSale({value: toBase(5)})
    let vestingCount1 = await crybCrowdsale.vestingCount(participants[1].address)
    expect(vestingCount1).to.equal(1)
  })

  it('should emit Buy event', async () => {
    await moveToPresaleStartTime()

    await expect(
      crybCrowdsale.connect(participants[0]).preSale({value: toBase(10)})
    )
    .to
    .emit(crybCrowdsale, 'Buy')
    .withArgs(
      participants[0].address,
      toBase(10),
      toBase(100),
    )
  })
})
