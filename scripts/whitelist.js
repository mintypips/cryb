const {ethers} = require('hardhat')
const fs = require('fs')
const {parse} = require('csv-parse')
const {from} = require('rxjs')
const {reduce} = require('rxjs/operators')
const {
  crybCrowdsale
} = require('../.config.json')

const parseCSV = async () => {
  const parser = fs
  .createReadStream(`${__dirname}/whitelist.csv`)
  .pipe(parse({
    delimiter: ','
  }))

  return await from(parser)
    .pipe(
      reduce((acc, record) => {
        return {
          accounts: [...acc.accounts, record[0]],
          amounts: [...acc.amounts, record[1]],
        }
      }, {
        accounts: [],
        amounts: []
      }),
    )
    .toPromise()
}

async function main() {
  const [owner] = await ethers.getSigners()
  const contract = await ethers.getContractAt(
    'CrybCrowdsale',
    crybCrowdsale
  )

  const {accounts, amounts} = await parseCSV()
  await contract.connect(owner).whitelist(accounts, amounts)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
