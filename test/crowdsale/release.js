const {expect} = require('chai')
const {getParticipants, getOwner} = require('../helpers/account')
const {toBase} = require('../helpers/utils')
const {endOfDay, addDays, fromSolTime, toSolTime, duration} = require('../helpers/time')
const {deployCrybCrowdsale} = require('../helpers/deployer')
const {setNextBlockTimestamp} = require('../helpers/evm')

describe('CrybCrowdsale: release', () => {
  let crybCrowdsale
  let crybToken
  let startTime
  let endTime
  let vestingStartDate
  let participants
  let owner

  beforeEach(async () => {
    const {timestamp} = await ethers.provider.getBlock()
    const now = new Date(fromSolTime(Number(timestamp)))
    startTime = endOfDay(addDays(1, now))
    endTime = endOfDay(addDays(20, now))
    vestingStartDate = endOfDay(addDays(30, now));

    ([crybCrowdsale, crybToken] = await deployCrybCrowdsale(
      startTime,
      endTime,
      vestingStartDate,
      duration.days(10),
      toBase(800),
      toBase(2000)
    ))
      
    participants = await getParticipants()
      
    // fund the crowdsale token contract
    owner = await getOwner()
    await crybToken.connect(owner).transfer(crybCrowdsale.address, toBase(1000))
  })

  const moveToPresaleStartTime = async () => {
    const startTime = await crybCrowdsale.startTime()
    await setNextBlockTimestamp(Number(startTime))
  }

  it('should allow user linearly release vested tokens', async () => {
    await moveToPresaleStartTime()
    // total amount ready to be vested is 300
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(30)})
    const vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 0)

    // vesting duration is 10 days
    for (let i = 1; i <= 10; i++) {
      // move one day from the vesting start time
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingStartDate)))))

      // release
      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).release(0)
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      
      // should get 1/10 of the total 300 tokens vested
      expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(30))
    }

    // the entire amount is released after the end of vesting period
    expect(await crybToken.balanceOf(participants[0].address)).to.equal(toBase(300))
  })

  it('should release all vesting positions for a given user', async () => {
    await moveToPresaleStartTime()

    // total amount ready to be vested is 300
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(30)})

    // 5 days later the same user buys more tokens thus a new vesting position is created
    await setNextBlockTimestamp(toSolTime(await addDays(5, new Date(fromSolTime(startTime)))))
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(50)})

    // from vesting day and for the next 10 days all vested positions will be released
    for (let i=1; i < 11; i++) {
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingStartDate)))))

      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).releaseAll()
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(80))
    }

    expect(await crybToken.balanceOf(participants[0].address)).to.equal(toBase(300 + 500))
  })

  it('should support release vested position for multiple users', async () => {
    await moveToPresaleStartTime()
    // total amount ready to be vested is 300
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(30)})

    // 5 days later the another user buys tokens
    await setNextBlockTimestamp(toSolTime(await addDays(5, new Date(fromSolTime(startTime)))))
    await crybCrowdsale.connect(participants[1]).preSale({value: toBase(50)})

    // from vesting day and for the next 10 days all vested positions for each user will be released
    for (let i=1; i < 11; i++) {
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingStartDate)))))

      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).releaseAll()
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(30))

      balanceBefore = await crybToken.balanceOf(participants[1].address)
      await crybCrowdsale.connect(participants[1]).releaseAll()
      balanceAfter = await crybToken.balanceOf(participants[1].address)

      // due to some timing-traveling issues we have to do the following
      if(i === 1) {
        expect(balanceAfter.sub(balanceBefore)).to.equal('50000578703703703703')
      }
      else if(i === 10) {
        expect(balanceAfter.sub(balanceBefore)).to.equal('49999421296296296297')
      }
      else {
        expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(50))
      }
    }

    expect(await crybToken.balanceOf(participants[0].address)).to.equal(toBase(300))
    expect(await crybToken.balanceOf(participants[1].address)).to.equal(toBase(500))
  })

  it('should allow whitelisted users release without any prior purchases via the buy method', async () => {
    await crybCrowdsale.whitelist(
      [participants[0].address, participants[1].address],
      [toBase(300), toBase(500)]
    )

    // from vesting day and for the next 10 days all vested positions for each user will be released
    for (let i=1; i < 11; i++) {
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingStartDate)))))

      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).releaseAll()
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(30))

      balanceBefore = await crybToken.balanceOf(participants[1].address)
      await crybCrowdsale.connect(participants[1]).releaseAll()
      balanceAfter = await crybToken.balanceOf(participants[1].address)

      // due to some timing-traveling issues we have to do the following
      if(i === 1) {
        expect(balanceAfter.sub(balanceBefore)).to.equal('50000578703703703703')
      }
      else if(i === 10) {
        expect(balanceAfter.sub(balanceBefore)).to.equal('49999421296296296297')
      }
      else {
        expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(50))
      }
    }

    expect(await crybToken.balanceOf(participants[0].address)).to.equal(toBase(300))
    expect(await crybToken.balanceOf(participants[1].address)).to.equal(toBase(500))
  })

  it('should allow whitelisted to purchase more tokens', async () => {
    await crybCrowdsale.whitelist(
      [participants[0].address],
      [toBase(300)]
    )

    // 5 days later the same user buys more tokens thus a new vesting position is created
    await setNextBlockTimestamp(toSolTime(await addDays(5, new Date(fromSolTime(startTime)))))
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(50)})

    // from vesting day and for the next 10 days all vested positions the user will be released
    for (let i=1; i < 11; i++) {
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingStartDate)))))

      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).releaseAll()
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(80))
    }

    // on day 15 all position are fully vested
    expect(await crybToken.balanceOf(participants[0].address)).to.equal(toBase(300 + 500))
  })

  it('should emit Claimed', async () => {
    await moveToPresaleStartTime()
    // total amount ready to be vested is 300
    await crybCrowdsale.connect(participants[0]).preSale({value: toBase(30)})
    const vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 0)

    // vesting duration is 10 days
    for (let i = 1; i <= 10; i++) {
      // move one day from the vesting start time
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingStartDate)))))
      await expect(
        crybCrowdsale.connect(participants[0]).release(0)
      )
      .to
      .emit(crybCrowdsale, 'Claimed')
      .withArgs(
        participants[0].address,
        toBase(30),
      )
    }
  })
})
