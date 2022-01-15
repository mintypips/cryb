const {ethers} = require('hardhat')
const {
  deploymentParams,
  excludedAccounts
} = require('../.config.json')

async function main() {
  const [owner] = await ethers.getSigners()
  const crybToken = await ethers.getContractAt(
    'CrybToken',
    deploymentParams.crybToken
  )

  await crybToken.connect(owner).exludeMultiple(excludedAccounts)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

