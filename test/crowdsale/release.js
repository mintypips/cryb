const {expect} = require('chai')
const {getParticipants, getOwner} = require('../helpers/account')
const {toBase} = require('../helpers/utils')
const {endOfDay, addDays, fromSolTime, toSolTime} = require('../helpers/time')
const {deployCrybCrowdsale} = require('../helpers/deployer')
const {setNextBlockTimestamp} = require('../helpers/evm')

describe('CrybCrowdsale: release', () => {
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

  it('should allow user linearly release vested tokens', async () => {
    await moveToStartTime()
    // total amount ready to be vested is 300
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

    // the entire amount is released after the end of vesting period
    expect(await crybToken.balanceOf(participants[0].address)).to.equal(toBase(300))
  })

  it('should release all vesting positions for a given user', async () => {
    await moveToStartTime()

    // total amount ready to be vested is 300
    await crybCrowdsale.connect(participants[0]).buy({value: toBase(30)})
    const vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 0)

    // the first 4 days users releases linearly the vested tokens from position 1
    for (let i = 1; i <= 4; i++) {
      // move one day from the vesting start time
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingInfo.startTime)))))

      // release
      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).release(0)
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      
      // should get 1/10 of the total 300 tokens vested
      expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(30))
    }

    // 5 days later the same user buys more tokens thus a new vesting position is created
    await setNextBlockTimestamp(toSolTime(await addDays(5, new Date(fromSolTime(vestingInfo.startTime)))))
    await crybCrowdsale.connect(participants[0]).buy({value: toBase(50)})

    // from day 6 and on user will be able to release from both vesting positions
    for (let i=6; i <= 10; i++) {
      // move one day from the vesting start time
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingInfo.startTime)))))

      // release
      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).releaseAll()
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      
      if(i === 6) {
        // should get 2/10 of the total 300 tokens because position 0 was last released on day 4
        // vested and 1/10 from the 500 vested tokens from position 2
        expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(110))
      }
      else {
        // should get 1/10 of the total 300 tokens vested and 1/10 from the 500 vested tokens from position 2
        expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(80))
      }
    }

    // on day 10 we have fully released the tokens from position 1 and half of position 2
    expect(await crybToken.balanceOf(participants[0].address)).to.equal(toBase(300 + 250))

    // from day 11 until day 15 the rest of the vesting position 2 will be released and none of the fully vested position 1
    for (let i=11; i <= 15; i++) {
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingInfo.startTime)))))

      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).releaseAll()
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(50))
    }

    // on day 15 all position are fully vested
    expect(await crybToken.balanceOf(participants[0].address)).to.equal(toBase(300 + 500))
  })

  it('should support release vested position for multiple users', async () => {
    await moveToStartTime()
    // total amount ready to be vested is 300
    await crybCrowdsale.connect(participants[0]).buy({value: toBase(30)})
    const vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 0)

    // the first 4 days users releases linearly the vested tokens from position 1
    for (let i = 1; i <= 4; i++) {
      // move one day from the vesting start time
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingInfo.startTime)))))

      // release
      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).release(0)
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      
      // should get 1/10 of the total 300 tokens vested
      expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(30))
    }

    // 5 days later the another user buys tokens
    await setNextBlockTimestamp(toSolTime(await addDays(5, new Date(fromSolTime(vestingInfo.startTime)))))
    await crybCrowdsale.connect(participants[1]).buy({value: toBase(50)})

    // from day 6 and on user will be able to release from both vesting positions
    for (let i=6; i <= 10; i++) {
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingInfo.startTime)))))

      // release user 1
      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).releaseAll()
      let balanceAfter = await crybToken.balanceOf(participants[0].address)

      if(i === 6) {
        // should get 2/10 of the total 300 tokens because position 0 was last released on day 4
        expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(60))
      }
      else {
        expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(30))
      }

      // release user 2
      balanceBefore = await crybToken.balanceOf(participants[1].address)
      await crybCrowdsale.connect(participants[1]).releaseAll()
      balanceAfter = await crybToken.balanceOf(participants[1].address)
      
      if(i === 6) {
        // slightly more that 50 in the first iteration
        expect(balanceAfter.sub(balanceBefore)).to.equal('50000578703703703703')
      }
      else {
        expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(50))
      }
    }

    expect(await crybToken.balanceOf(participants[0].address)).to.equal(toBase(300))
    expect(await crybToken.balanceOf(participants[1].address)).to.equal('250000578703703703703')

    // from day 11 until day 15 only participant 1 can release; participant 0 has released everything
    for (let i=11; i <= 15; i++) {
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingInfo.startTime)))))

      let balanceBefore = await crybToken.balanceOf(participants[0].address)
      await crybCrowdsale.connect(participants[0]).releaseAll()
      let balanceAfter = await crybToken.balanceOf(participants[0].address)
      expect(balanceAfter.sub(balanceBefore)).to.equal(0)

      balanceBefore = await crybToken.balanceOf(participants[1].address)
      await crybCrowdsale.connect(participants[1]).releaseAll()
      balanceAfter = await crybToken.balanceOf(participants[1].address)

      if(i === 15) {
        // for the same reason as above
        expect(balanceAfter.sub(balanceBefore)).to.equal('49999421296296296297')
      }
      else {
        expect(balanceAfter.sub(balanceBefore)).to.equal(toBase(50))
      }
    }

    // on day 15 all position 2 is fully vested and position 1 remains intact as it as fully released on day 10
    expect(await crybToken.balanceOf(participants[0].address)).to.equal(toBase(300))
    expect(await crybToken.balanceOf(participants[1].address)).to.equal(toBase(500))
  })

  it('should emit Claimed', async () => {
    await moveToStartTime()
    // total amount ready to be vested is 300
    await crybCrowdsale.connect(participants[0]).buy({value: toBase(30)})
    const vestingInfo = await crybCrowdsale.getVestingInfo(participants[0].address, 0)

    // vesting duration is 10 days
    for (let i = 1; i <= 10; i++) {
      // move one day from the vesting start time
      await setNextBlockTimestamp(toSolTime(await addDays(i, new Date(fromSolTime(vestingInfo.startTime)))))
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
