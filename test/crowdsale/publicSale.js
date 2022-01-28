const {expect} = require('chai')
const {getParticipants, getTreasury, getBalance, getOwner} = require('../helpers/account')
const {toBase} = require('../helpers/utils')
const {endOfDay, addDays, fromSolTime} = require('../helpers/time')
const {deployCrybCrowdsale} = require('../helpers/deployer')
const {setNextBlockTimestamp} = require('../helpers/evm')

describe('CrybCrowdsale: publicSale', () => {
  let crybCrowdsale
  let crybToken
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

    participants = await getParticipants()

    // fund the crowdsale token contract
    const owner = await getOwner()
    await crybToken.connect(owner).transfer(crybCrowdsale.address, toBase(1000))
  })

  const moveToPublicStartTime = async () => {
    const startTime = await crybCrowdsale.startTime(1)
    await setNextBlockTimestamp(Number(startTime))
  }

  const moveToPublicEndTime = async () => {
    const endTime = await crybCrowdsale.endTime(1)
    await setNextBlockTimestamp(Number(endTime))
  }

  it('should revert if sale has not started', async () => {
    await expect(
      crybCrowdsale.connect(participants[0]).publicSale({value: toBase(1, 17)}) //0.1
    ).to.revertedWith('public sale not started')
  })

  it('should revert if sale has ended', async () => {
    await moveToPublicEndTime()

    await expect(
      crybCrowdsale.connect(participants[0]).publicSale({value: toBase(1, 17)}) //0.1
    ).to.revertedWith('public sale ended')
  })

  it('should revert if send 0 ETH', async () => {
    await moveToPublicStartTime()

    await expect(
      crybCrowdsale.connect(participants[0]).publicSale({value: 0})
    ).to.revertedWith('cannot accept 0')
  })

  it('should revert if sold out', async () => {
    await moveToPublicStartTime()

    await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(30)}) // 30 ETH will buy 300 tokens
    await crybCrowdsale.connect(participants[1]).publicSale({value: toBase(30)}) // 30 ETH will buy 300 tokens
    await crybCrowdsale.connect(participants[2]).publicSale({value: toBase(30)}) // 30 ETH will buy 300 tokens
    await crybCrowdsale.connect(participants[3]).publicSale({value: toBase(10)}) // 10 ETH will buy 100 tokens

    // 1000 has been already sold which is the total available for sale
    await expect(
      crybCrowdsale.connect(participants[0]).publicSale({value: 1}) // even the tiniest amount should make it fail
    ).to.revertedWith('sold out')
  })

  it('should increase the totalRaised value', async () => {
    await moveToPublicStartTime()
    await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(30)})
    let totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(30))

    await crybCrowdsale.connect(participants[1]).publicSale({value: toBase(30)})
    totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(60))

    await crybCrowdsale.connect(participants[2]).publicSale({value: toBase(30)})
    totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(90))

    await crybCrowdsale.connect(participants[3]).publicSale({value: toBase(10)})
    totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(100))
  })

  it('should increase the totalSold value', async () => {
    await moveToPublicStartTime()

    await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(30)})
    let totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(300))

    await crybCrowdsale.connect(participants[1]).publicSale({value: toBase(30)})
    totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(600))

    await crybCrowdsale.connect(participants[2]).publicSale({value: toBase(30)})
    totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(900))

    await crybCrowdsale.connect(participants[3]).publicSale({value: toBase(10)})
    totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(1000))
  })

  it('should transfer ETH to the treasury account', async () => {
    await moveToPublicStartTime()

    const treasury = await getTreasury()

    let treasuryBalanceBefore = await getBalance(treasury.address)

    await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(30)})
    let treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(30))

    await crybCrowdsale.connect(participants[1]).publicSale({value: toBase(30)})
    treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(60))

    await crybCrowdsale.connect(participants[2]).publicSale({value: toBase(30)})
    treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(90))

    // started with x balance ended with x + 100 balance received from the crowdsale
    await crybCrowdsale.connect(participants[3]).publicSale({value: toBase(10)})
    treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(100))
  })

  it('should transfer the tokens to the buyer', async () => {
    await moveToPublicStartTime()

    let balanceBefore = await crybToken.balanceOf(participants[0].address)
    await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(30)})
    let balanceAfter = await crybToken.balanceOf(participants[0].address)
    expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(300))

    // same user
    balanceBefore = await crybToken.balanceOf(participants[0].address)
    await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(20)})
    balanceAfter = await crybToken.balanceOf(participants[0].address)
    expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(200))

    // another user
    balanceBefore = await crybToken.balanceOf(participants[1].address)
    await crybCrowdsale.connect(participants[1]).publicSale({value: toBase(40)})
    balanceAfter = await crybToken.balanceOf(participants[1].address)
    expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(400))
  })

  it('should emit Buy event', async () => {
    await moveToPublicStartTime()

    await expect(
      crybCrowdsale.connect(participants[0]).publicSale({value: toBase(30)})
    )
    .to
    .emit(crybCrowdsale, 'Buy')
    .withArgs(
      participants[0].address,
      toBase(30),
      toBase(300),
    )
  })

  // it('should create a new vesting position for the given users', async () => {
  //   await moveToPublicStartTime()
    
  //   let {blockNumber} = await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(30)})
  //   let {timestamp} = await ethers.provider.getBlock(blockNumber)
  //   let vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 0)
  //   expect(vestingInfo.amount).to.equal(toBase(300))
  //   expect(vestingInfo.totalClaimed).to.equal(0)
  //   expect(vestingInfo.periodClaimed).to.equal(0)
  //   expect(vestingInfo.startTime).to.equal(timestamp);

  //   ({blockNumber} = await crybCrowdsale.connect(participants[1]).publicSale({value: toBase(40)}));
  //   ({timestamp} = await ethers.provider.getBlock(blockNumber));
  //   (vestingInfo = await crybCrowdsale.getVestingInfo(participants[1].address, 0));
  //   expect(vestingInfo.amount).to.equal(toBase(400))
  //   expect(vestingInfo.totalClaimed).to.equal(0)
  //   expect(vestingInfo.periodClaimed).to.equal(0)
  //   expect(vestingInfo.startTime).to.equal(timestamp)
  // })

  // it('should allow the same user have multiple vesting positions', async () => {
  //   await moveToPublicStartTime()
    
  //   let {blockNumber} = await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(30)})
  //   let {timestamp} = await ethers.provider.getBlock(blockNumber)
  //   let vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 0)
  //   expect(vestingInfo.amount).to.equal(toBase(300))
  //   expect(vestingInfo.totalClaimed).to.equal(0)
  //   expect(vestingInfo.periodClaimed).to.equal(0)
  //   expect(vestingInfo.startTime).to.equal(timestamp);

  //   // second position
  //   ({blockNumber} = await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(10)}));
  //   ({timestamp} = await ethers.provider.getBlock(blockNumber));
  //   (vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 1));
  //   expect(vestingInfo.amount).to.equal(toBase(100))
  //   expect(vestingInfo.totalClaimed).to.equal(0)
  //   expect(vestingInfo.periodClaimed).to.equal(0)
  //   expect(vestingInfo.startTime).to.equal(timestamp);

  //   // third position
  //   ({blockNumber} = await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(40)}));
  //   ({timestamp} = await ethers.provider.getBlock(blockNumber));
  //   (vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 2));
  //   expect(vestingInfo.amount).to.equal(toBase(400))
  //   expect(vestingInfo.totalClaimed).to.equal(0)
  //   expect(vestingInfo.periodClaimed).to.equal(0)
  //   expect(vestingInfo.startTime).to.equal(timestamp)
  // })

  // it('should update the vesting count for each user', async () => {
  //   await moveToPublicStartTime()

  //   await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(30)})
  //   let vestingCount0 = await crybCrowdsale.vestingCount(participants[0].address)
  //   expect(vestingCount0).to.equal(1)

  //   // second vesting position for user 0
  //   await crybCrowdsale.connect(participants[0]).publicSale({value: toBase(10)})
  //   vestingCount0 = await crybCrowdsale.vestingCount(participants[0].address)
  //   expect(vestingCount0).to.equal(2)

  //   // first position for user 1
  //   await crybCrowdsale.connect(participants[1]).publicSale({value: toBase(5)})
  //   let vestingCount1 = await crybCrowdsale.vestingCount(participants[1].address)
  //   expect(vestingCount1).to.equal(1)
  // })
})
