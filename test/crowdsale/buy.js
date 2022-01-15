const {expect} = require('chai')
const {getParticipants, getTreasury, getBalance} = require('../helpers/account')
const {toBase} = require('../helpers/utils')
const {endOfDay, addDays, fromSolTime} = require('../helpers/time')
const {deployCrybCrowdsale} = require('../helpers/deployer')
const {setNextBlockTimestamp} = require('../helpers/evm')

describe('CrybCrowdsale: buy', () => {
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

  it('should revert if sold out', async () => {
    await moveToStartTime()

    await crybCrowdsale.connect(participants[0]).buy({value: toBase(30)}) // 30 ETH will buy 300 tokens
    await crybCrowdsale.connect(participants[1]).buy({value: toBase(30)}) // 30 ETH will buy 300 tokens
    await crybCrowdsale.connect(participants[2]).buy({value: toBase(30)}) // 30 ETH will buy 300 tokens
    await crybCrowdsale.connect(participants[3]).buy({value: toBase(10)}) // 10 ETH will buy 100 tokens

    // 1000 has been already sold which is the total available for sale
    await expect(
      crybCrowdsale.connect(participants[0]).buy({value: 1}) // even the tiniest amount should make it fail
    ).to.revertedWith('sold out')
  })

  it('should increase the totalRaised value', async () => {
    await moveToStartTime()
    await crybCrowdsale.connect(participants[0]).buy({value: toBase(30)})
    let totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(30))

    await crybCrowdsale.connect(participants[1]).buy({value: toBase(30)})
    totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(60))

    await crybCrowdsale.connect(participants[2]).buy({value: toBase(30)})
    totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(90))

    await crybCrowdsale.connect(participants[3]).buy({value: toBase(10)})
    totalRaised = await crybCrowdsale.totalRaised()
    expect(totalRaised).to.equal(toBase(100))
  })

  it('should increase the totalSold value', async () => {
    await moveToStartTime()

    await crybCrowdsale.connect(participants[0]).buy({value: toBase(30)})
    let totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(300))

    await crybCrowdsale.connect(participants[1]).buy({value: toBase(30)})
    totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(600))

    await crybCrowdsale.connect(participants[2]).buy({value: toBase(30)})
    totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(900))

    await crybCrowdsale.connect(participants[3]).buy({value: toBase(10)})
    totalSold = await crybCrowdsale.totalSold()
    expect(totalSold).to.equal(toBase(1000))
  })

  it('should transfer ETH to the treasury account', async () => {
    await moveToStartTime()

    const treasury = await getTreasury()

    let treasuryBalanceBefore = await getBalance(treasury.address)

    await crybCrowdsale.connect(participants[0]).buy({value: toBase(30)})
    let treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(30))

    await crybCrowdsale.connect(participants[1]).buy({value: toBase(30)})
    treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(60))

    await crybCrowdsale.connect(participants[2]).buy({value: toBase(30)})
    treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(90))

    // started with x balance ended with x + 100 balance received from the crowdsale
    await crybCrowdsale.connect(participants[3]).buy({value: toBase(10)})
    treasuryBalanceAfter = await getBalance(treasury.address)
    expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toBase(100))
  })

  it('should emit Buy event', async () => {
    await moveToStartTime()

    await expect(
      crybCrowdsale.connect(participants[0]).buy({value: toBase(30)})
    )
    .to
    .emit(crybCrowdsale, 'Buy')
    .withArgs(
      participants[0].address,
      toBase(30),
      toBase(300),
    )
  })
})
