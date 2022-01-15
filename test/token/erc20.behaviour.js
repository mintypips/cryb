const {expect} = require('chai')
const { getTreasury } = require('../helpers/account')
const {deployCrybToken} = require('../helpers/deployer')
const {toBase} = require('../helpers/utils')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const shouldBehaveLikeERC20 = (errorPrefix, initialSupply, initialHolder, alice, bob) => {
  let token

  describe('total supply',  ()  => {
    beforeEach(async () => {
      token = await deployCrybToken()
    })

    it('returns the total amount of tokens', async () => {
      expect(await token.totalSupply()).to.be.equal(initialSupply)
    })
  })

  describe('balanceOf', () => {
    beforeEach(async () => {
      token = await deployCrybToken()
    })

    describe('when the requested account has no tokens', () => {
      it('returns zero', async () => {
        expect(await token.balanceOf(bob.address)).to.be.equal('0')
      })
    })

    describe('when the requested account has some tokens', () => {
      it('returns the total amount of tokens', async () => {
        expect(await token.balanceOf(initialHolder.address)).to.be.equal(initialSupply)
      })
    })
  })

  describe('transfer', () => {
    it('shouldBehaveLikeERC20Transfer', () => {
      shouldBehaveLikeERC20Transfer(errorPrefix, initialHolder, alice, initialSupply,
       (token, from, to, value) => {
          return token.connect(from).transfer(to, value)
        },
      )
    })
  })

  describe('transfer from', () => {
    const spender = alice
    let token

    beforeEach(async () => {
      token = await deployCrybToken()
    })

    describe('when the token owner is not the zero address', ()  => {
      const tokenOwner = initialHolder

      describe('when the recipient is not the zero address', ()  => {
        const to = bob

        describe('when the spender has enough approved balance', ()  => {
          beforeEach(async () => {
            await token.connect(initialHolder).approve(spender.address, initialSupply)
          })

          describe('when the token owner has enough balance', () => {
            const amount = initialSupply

            it('transfers the requested amount', async () => {
              // 5% will go to the treasury
              await token.connect(spender).transferFrom(tokenOwner.address, to.address, amount)

              expect(await token.balanceOf(tokenOwner.address)).to.be.equal(0)

              const treasury = await getTreasury()
              expect(await token.balanceOf(spender.address)).to.be.equal(toBase('0'))
              expect(await token.balanceOf(to.address)).to.be.equal(amount.sub(toBase('50000000')))
              expect(await token.balanceOf(treasury.address)).to.be.equal(toBase('50000000'))
            })

            it('decreases the spender allowance', async () => {
              await token.connect(spender).transferFrom(tokenOwner.address, to.address, amount)

              expect(await token.allowance(tokenOwner.address, spender.address)).to.be.equal('0')
            })

            it('emits a transfer event', async () => { 
              await expect(
                await token.connect(spender).transferFrom(tokenOwner.address, to.address, amount)
              )
              .to
              .emit(token, 'Transfer')
              .withArgs(
                tokenOwner.address,
                to.address,
                toBase('1000000000')
              )
            })

            it('emits an approval event', async () => {
              await expect(
                await token.connect(spender).transferFrom(tokenOwner.address, to.address, amount)
              )
              .to
              .emit(token, 'Approval')
              .withArgs(
                tokenOwner.address,
                spender.address,
                await token.allowance(tokenOwner.address, spender.address),
              )
            })
          })

          it('when the token owner does not have enough balance', async () => {
            const amount = initialSupply.add(toBase(1))

            await expect(
              token.connect(spender).transferFrom(tokenOwner.address, to.address, amount)
            ).to.reverted
          })
        })

        describe('when the spender does not have enough approved balance', () => {
          beforeEach(async () => {
            await token.connect(tokenOwner).approve(spender.address, initialSupply.sub(toBase(1)))
          })

          describe('when the token owner has enough balance', () => {
            const amount = initialSupply

            it('reverts', async () => {
              await expect(
                token.connect(spender).transferFrom(tokenOwner.address, to.address, amount)
              ).to.revertedWith(`${errorPrefix}: transfer amount exceeds allowance`)
            })
          })

          describe('when the token owner does not have enough balance', () => {
            const amount = initialSupply.add(toBase(1))

            it('reverts', async () => {
              await expect(
                token.connect(spender).transferFrom(tokenOwner.address, to.address, amount)
              ).to.reverted
            })
          })
        })
      })

      describe('when the recipient is the zero address', () => {
        const amount = initialSupply
        const to = ZERO_ADDRESS

        beforeEach(async () => {
          await token.connect(tokenOwner).approve(spender.address, amount)
        })

        it('reverts', async () => {
          await expect(
            token.connect(spender).transferFrom(tokenOwner.address, to, amount)
          ).to.revertedWith(`${errorPrefix}: transfer to the zero address`)
        })
      })
    })

    describe('when the token owner is the zero address', () => {
      const amount = 0
      const tokenOwner = ZERO_ADDRESS
      const to = bob

      it('reverts', async () => {
        await expect(
          token.connect(spender).transferFrom(tokenOwner, to.address, amount)
        ).to.revertedWith(`${errorPrefix}: transfer from the zero address`)
      })
    })
  })

  describe('approve', () => {
    it('approve', () => {
      shouldBehaveLikeERC20Approve(errorPrefix, initialHolder, alice, initialSupply,
        (token, owner, spender, amount) => {
          return token.connect(owner).approve(spender, amount)
        }
      )
    })
  })
}

const shouldBehaveLikeERC20Transfer =  (errorPrefix, from, to, balance, transfer) => {
  let token

  describe('when the recipient is not the zero address', () => {
    beforeEach(async () => {
      token = await deployCrybToken()
    })

    it('when the sender does not have enough balance', async  () => {
      const amount = balance.add(toBase(1))

      await expect(
        transfer(token, from, to.address, amount)
      ).to.reverted
    })

    describe('when the sender transfers all balance',  () => {
      const amount = balance

      it('transfers the requested amount', async () => {
        await transfer(token, from, to.address, amount)

        expect(await token.balanceOf(from.address)).to.be.equal(0)

        const treasury = await getTreasury()
        expect(await token.balanceOf(from.address)).to.be.equal(toBase('0'))
        expect(await token.balanceOf(to.address)).to.be.equal(amount.sub(toBase('50000000')))
        expect(await token.balanceOf(treasury.address)).to.be.equal(toBase('50000000'))
      })

      it('emits a transfer event', async  () => {
        await expect(
          await transfer(token, from, to.address, amount)
        )
        .to
        .emit(token, 'Transfer')
        .withArgs(
          from.address,
          to.address,
          toBase('1000000000')
        )
      })
    })
  })

  describe('when the recipient is the zero address',  () => {
    beforeEach(async () => {
      token = await deployCrybToken()
    })

    it('reverts', async  () => {
      await expect(
        transfer(token, from, ZERO_ADDRESS, balance)
      ).to.revertedWith(`${errorPrefix}: transfer to the zero address`)
    });
  });
}

const shouldBehaveLikeERC20Approve = (errorPrefix, owner, spender, supply, approve) => {
  describe('when the spender is not the zero address',  () => {
    const amount = supply
    let token

    beforeEach(async () => {
      token = await deployCrybToken()
    })

    describe('when the sender has enough balance',  () => {

      it('emits an approval event', async  () => {
        await expect(
          await approve(token, owner, spender.address, amount)
        )
        .to
        .emit(token, 'Approval')
        .withArgs(
          owner.address,
          spender.address,
          amount
        )
      })

      describe('when there was no approved amount before',  ()  => {
        it('approves the requested amount', async () => {
          await approve(token, owner, spender.address, amount)

          expect(await token.allowance(owner.address, spender.address)).to.be.equal(amount)
        })
      })

      describe('when the spender had an approved amount',  () => {
        beforeEach(async () => {
          await approve(token, owner, spender.address, toBase(1))
        })

        it('approves the requested amount and replaces the previous one', async  () => {
          await approve(token, owner, spender.address, amount)

          expect(await token.allowance(owner.address, spender.address)).to.be.equal(amount)
        })
      })
    })

    describe('when the sender does not have enough balance',  () => {
      it('emits an approval event', async  () => {
        await expect(
          await approve(token, owner, spender.address, amount)
        )
        .to
        .emit(token, 'Approval')
        .withArgs(
          owner.address,
          spender.address,
          amount
        )
      })

      describe('when there was no approved amount before',  () => {
        it('approves the requested amount', async  () => {
          await approve(token, owner, spender.address, amount)

          expect(await token.allowance(owner.address, spender.address)).to.be.equal(amount)
        })
      })

      describe('when the spender had an approved amount',  () => {
        beforeEach(async  () => {
          await approve(token, owner, spender.address, toBase(1))
        })

        it('approves the requested amount and replaces the previous one', async () => {
          await approve(token, owner, spender.address, amount)

          expect(await token.allowance(owner.address, spender.address)).to.be.equal(amount)
        })
      })
    })
  })

  describe('when the spender is the zero address', () => {
    let token

    beforeEach(async () => {
      token = await deployCrybToken()
    })

    it('reverts', async () => {
      await expect(
        approve(token, owner, ZERO_ADDRESS, supply)
      ).to.revertedWith(`${errorPrefix}: approve to the zero address`)
    })
  })
}

module.exports = {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve
}
