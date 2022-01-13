const {expect} = require('chai')
const {getOwner, getBob, getAlice} = require('../helpers/accounts')
const {deployCrybToken} = require('../helpers/deployer')
const {toBase} = require('../helpers/utils')
const {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve
} = require('./erc20.behaviour')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

describe('ERC20', () => {
  let initialHolder
  let alice
  let bob
  let token
  const initialSupply = toBase('1000000000')

  before(async () => {
    initialHolder = await getOwner()
    alice = await getAlice()
    bob = await getBob()
  })

  beforeEach(async () => {
    token = await deployCrybToken()
  })

  it('has a name', async  () => {
    expect(await token.name()).to.equal('Cryb Token')
  })

  it('has a symbol', async () => {
    expect(await token.symbol()).to.equal('CRYB')
  })

  it('has 18 decimals', async () => {
    expect(await token.decimals()).to.be.equal(18)
  })

  it('shouldBehaveLikeERC20', async () => {
    shouldBehaveLikeERC20('ERC20', initialSupply, initialHolder, alice, bob);
  })

  describe('decrease allowance', () => {
    describe('when the spender is not the zero address', () => {
      let spender

      beforeEach(async () => {
        initialHolder = await getOwner()
        alice = await getAlice()
        spender = alice
      })
  
      const shouldDecreaseApproval = (amount) => {
        describe('when there was no approved amount before', () => {
          it('reverts', async () => {
            await expect(
              token.connect(initialHolder).decreaseAllowance(spender.address, amount)
            ).to.revertedWith('ERC20: decreased allowance below zero')
          })
        })

        describe('when the spender had an approved amount', () => {
          const approvedAmount = amount

          beforeEach(async () => {
            await token.connect(initialHolder).approve(spender.address, approvedAmount)
          })

          it('emits an approval event', async () => {
            await expect(
              await token.connect(initialHolder).decreaseAllowance(spender.address, approvedAmount)
            )
            .to
            .emit(token, 'Approval')
            .withArgs(
              initialHolder.address,
              spender.address,
              '0'
            )
          })

          it('decreases the spender.address allowance subtracting the requested amount', async () => {
            await token.connect(initialHolder).decreaseAllowance(spender.address, approvedAmount.sub(1))

            expect(await token.allowance(initialHolder.address, spender.address)).to.be.equal('1')
          })

          it('sets the allowance to zero when all allowance is removed', async () => {
            await token.connect(initialHolder).decreaseAllowance(spender.address, approvedAmount)
            expect(await token.allowance(initialHolder.address, spender.address)).to.be.equal('0')
          })

          it('reverts when more than the full allowance is removed', async () => {
            await expect(
              token.connect(initialHolder).decreaseAllowance(spender.address, approvedAmount.add(1)),
            ).to.revertedWith('ERC20: decreased allowance below zero')
          })
        })
      }

      describe('when the sender has enough balance', () => {
        const amount = initialSupply

        shouldDecreaseApproval(amount)
      })

      describe('when the sender does not have enough balance', () => {
        const amount = initialSupply.add(1)

        shouldDecreaseApproval(amount)
      })
    })

    describe('when the spender is the zero address', () => {
      const amount = initialSupply
      const spender = ZERO_ADDRESS

      it('reverts', async () => {
        await expect(
          token.connect(initialHolder).decreaseAllowance(spender, amount)
        ).to.revertedWith('ERC20: decreased allowance below zero')
      })
    })
  })

  describe('increase allowance', () => {
    const amount = initialSupply

    describe('when the spender is not the zero address', () => {
      let spender

      beforeEach(async () => {
        initialHolder = await getOwner()
        alice = await getAlice()
        spender = alice
      })
  
      describe('when the sender has enough balance', ()  => {
        it('emits an approval event', async () => {
          await expect(
            await token.connect(initialHolder).increaseAllowance(spender.address, amount)
          )
          .to
          .emit(token, 'Approval')
          .withArgs(
            initialHolder.address,
            spender.address,
            amount,
          )
        })

        describe('when there was no approved amount before', () => {
          it('approves the requested amount', async () => {
            await token.connect(initialHolder).increaseAllowance(spender.address, amount)

            expect(await token.allowance(initialHolder.address, spender.address)).to.be.equal(amount)
          })
        })

        describe('when the spender had an approved amount', () => {
          beforeEach(async () => {
            await token.connect(initialHolder).approve(spender.address, toBase('1'))
          })

          it('increases the spender allowance adding the requested amount', async () => {
            await token.connect(initialHolder).increaseAllowance(spender.address, amount)

            expect(await token.allowance(initialHolder.address, spender.address)).to.be.equal(amount.add(toBase(1)))
          })
        })
      })

      describe('when the sender does not have enough balance', () => {
        const amount = initialSupply.add(toBase(1))

        it('emits an approval event', async () => {
          await expect(
            await token.connect(initialHolder).increaseAllowance(spender.address, amount)
          )
          .to
          .emit(token, 'Approval')
          .withArgs(
            initialHolder.address,
            spender.address,
            amount,
          )
        })

        describe('when there was no approved amount before', () => {
          it('approves the requested amount', async () => {
            await token.connect(initialHolder).increaseAllowance(spender.address, amount)

            expect(await token.allowance(initialHolder.address, spender.address)).to.be.equal(amount)
          })
        })

        describe('when the spender had an approved amount', () => {
          beforeEach(async () => {
            await token.connect(initialHolder).approve(spender.address, toBase('1'))
          })

          it('increases the spender allowance adding the requested amount', async () => {
            await token.connect(initialHolder).increaseAllowance(spender.address, amount)

            expect(await token.allowance(initialHolder.address, spender.address)).to.be.equal(amount.add(toBase(1)))
          })
        })
      })
    })

    describe('when the spender is the zero address', () => {
      const spender = ZERO_ADDRESS

      it('reverts', async () => {
        await expect(
          token.connect(initialHolder).increaseAllowance(spender, amount)
        ).to.revertedWith('ERC20: approve to the zero address')
      })
    })
  })

  describe('_transfer', () => {
    it('shouldBehaveLikeERC20Transfer', async () => {
      shouldBehaveLikeERC20Transfer('ERC20', initialHolder, alice, initialSupply,  (token, from, to, amount) => {
        return token.transferInternal(from.address, to, amount);
      });
    })

    describe('when the sender is the zero address', () => {
      it('reverts', async () => {
        await expect(
          token.transferInternal(ZERO_ADDRESS, initialHolder.address, initialSupply)
        ).to.revertedWith('ERC20: transfer from the zero address')
      });
    });
  });

  describe('_approve', () => {
    it('shouldBehaveLikeERC20Approve', async () => {
      shouldBehaveLikeERC20Approve('ERC20', initialHolder, alice, initialSupply,  (token, owner, spender, amount) => {
        return token.approveInternal(owner.address, spender, amount);
      });
    })

    describe('when the owner is the zero address', () => {
      it('reverts', async () => {
        await expect(
          token.approveInternal(ZERO_ADDRESS, initialHolder.address, initialSupply)
        ).to.revertedWith('ERC20: approve from the zero address')
      });
    });
  });
})
