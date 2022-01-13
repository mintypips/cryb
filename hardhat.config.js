require('@nomiclabs/hardhat-waffle')
require('hardhat-contract-sizer')
require('@openzeppelin/hardhat-upgrades')
require('hardhat-gas-reporter')
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const {owner, infura} = require('./.config.json');

const privKey = process.env.PRIV_KEY || owner.privKey

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
      accounts: {
        mnemonic: 'bulk relax gun behind essence sort coil forget misery matter betray range',
        accountsBalance: '100000000000000000000000000000000'
      }
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${infura.projectId}`,
      accounts: [privKey],
      live: true,
      timeout: 1800000,
      gasPrice: 60000000000,
      saveDeployments: true
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${infura.projectId}`,
      accounts: [privKey],
      live: true,
      timeout: 1800000,
      saveDeployments: true
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.11",
      }
    ]
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000
    },
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 5
  }
};
