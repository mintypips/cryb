# CrybCrowdsale

Deployment
===

Create the `.config.json` file in the root directory. A sample of the file is below


```
{
  "owner": {
    "privKey": "",
    "address": "0xB6f2D6E6e7A6236Cf8fafab61ebd4c8dcb1f5d12"
  },
  "infura": {
    "projectId": "",
    "projectSecret": ""
  },
  "deploymentParams": {
    "tax": "500", // 500 / 10000 = 5%
    "treasury": "0xB6f2D6E6e7A6236Cf8fafab61ebd4c8dcb1f5d12", // this will receive the funds from the sale
    "crybToken": "0x452CAC1308DF5aE3741abA286a07BC7c889FF2a4",
    "rate": "100", // price per token 0.01 and thus rate = 1 / 0.01 = 100
    "startTime": "1642254362", // start time of the sale in epoch (secs not ms)
    "endTime": "1642772762", // // end time of the sale in epoch (secs not ms)
    "maxAllocation": "", // max number of tokens each user can purchase
    "availebleForSale": "100000", // token has 18 decimals, we don't need to include the decimals here; this is 100K
    "vestingStartDate": "", // the date when vesting starts
    "vestingDuration": "864000", // duration of the vesting position in seconds
    "cliff": "0", // cliff date in unix epoch
  },
  "crybCrowdsale": "0xeac5e0A44572Ed36DAC050Ac34dD2a0A9b296405",
  "excludedAccounts": ["0xB6f2D6E6e7A6236Cf8fafab61ebd4c8dcb1f5d12", "0xeac5e0A44572Ed36DAC050Ac34dD2a0A9b296405]
}
```

1. Deploy the CrybToken contract

`yarn deploy:token:mainnet`

This will print the deployed contract address

2. Update the `crybToken` in the config file with the above address
3. Deploy the CrybCrowdsale contract

`yarn deploy:crowdsale:mainnet`

This will print the deployed contract address

4. Update the `crybCrowdsale` prop in the config file with the deployed contract address from above

5. Exclude owner, treasury and crowdsale contract from being taxed. To do so, we can include all addresses we want to exclude in the `excludedAccounts` prop in the config file and then run the following command:

`yarn excludeAccount:rinkeby`

6. Fund the deployed crowdsale contract with the tokens that are available for sale

Note
===

- On the front end we need to make sure that the ETH amount user wants to send will guarantee him a successful purchase. More specifically, there is a limit of how many CRYB tokens the contract will sell; thus towards the end of the crowdsale the amount a user sends might exceed the amount of tokens currently available. To find out the max one can send you should use the following equation:

```
remainingTokens = availableForSale - totalSold
MaxValue = remainingTokens / rate
```

- The `CrybCrowdsale` contract and the owner that has the initial total supply of CRYB should be excluded from the taxation imposed on all CRYB transfers???

Rate Calculation
===

`rate = 1 / price per token in ETH`

e.g. 

price per token 0.1 ETH so rate is 1/0.1=10. 

This rate suggests that for each ETH we send it we will receive 10 tokens in exchange

Presale
===

- `availableForSale` 66M tokens
- `rate` the price is $0.1 which at the current price of ETH ($2,500) will be 0.00004ETH and thus the rate is 1/0.00004 = 25,000
- `maxAllocation` is 10 ETH, the rate is 25,000 thus the max allocation of tokens is 250,000 tokens

**Public Sale**
- `availableForSale` 66M (from pre-sale) + available tokens for public sale
