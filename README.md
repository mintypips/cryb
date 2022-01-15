# CrybCrowdsale

Note
===

- On the front end we need to make sure that the ETH amount user wants to send will guarantee him a successful purchase. More specifically, there is a limit of how many CRYB tokens the contract will sell; thus towards the end of the crowdsale the amount a user sends might exceed the amount of tokens currently available. To find out the max one can send you should use the following equation:

```
remainingTokens = availableForSale - totalSold
MaxValue = remainingTokens / rate
```

- The `CrybCrowdsale` contract should be excluded from the taxation imposed on all CRYB transfers???
