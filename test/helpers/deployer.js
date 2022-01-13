const {Contract} = require('../helpers/utils')
const {getTreasury} = require('./accounts')

const deployCrybToken = async () => {
  const treasury = await getTreasury()
  const CrybToken = await Contract('MockCrybToken')
  return await CrybToken.deploy(
    500, // 5%
    treasury.address
  )
}

module.exports = {
  deployCrybToken
}
