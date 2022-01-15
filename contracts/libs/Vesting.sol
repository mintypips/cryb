// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

library Vesting {
  struct VestingInfo {
    uint256 amount;
    uint256 totalClaimed;
    uint256 periodClaimed;
    uint256 startTime;
  }

  struct State {
    uint256 vestingDuration;
    uint256 cliff;

    mapping (address => VestingInfo[]) vestingInfo;
  }

  function initialize(
    State storage self,
    uint256 vestingDuration,
    uint256 cliff  
  ) public {
    self.vestingDuration = vestingDuration;
    self.cliff = cliff;
  }

  function vestingCount(State storage self, address beneficiary) external view returns (uint256) {
    return self.vestingInfo[beneficiary].length;
  }

  function addBeneficiary(
    State storage self,
    address beneficiary,
    uint256 startTime,
    uint256 amount
  ) public {
    require(beneficiary != address(0), "Beneficiary cannot be zero address");
    
    self.vestingInfo[beneficiary].push(VestingInfo({
      amount: amount,
      startTime: startTime,
      totalClaimed: 0,
      periodClaimed: 0
    }));
  }

  function getVestingDuration(State storage self) private view returns(uint256) {
    return self.vestingDuration;
  }

  function getCliff(State storage self) private view returns(uint256) {
    return self.cliff;
  }

  function getVestingInfo(
    State storage self,
    address beneficiary,
    uint256 index
  ) public view returns(VestingInfo storage) {
    return self.vestingInfo[beneficiary][index];
  }

  function release(
    State storage self,
    address beneficiary,
    uint256 index
  ) public returns(uint256) {
    uint256 periodToVest;
    uint256 amountToVest;

    (periodToVest, amountToVest) = getTokenReleaseInfo(self, beneficiary, index);

    if(amountToVest > 0) {
      VestingInfo storage vestingInfo = getVestingInfo(self, beneficiary, index);
      vestingInfo.periodClaimed += periodToVest;
      vestingInfo.totalClaimed += amountToVest;
    }

    return amountToVest;
  }

  function getTokenReleaseInfo(
    State storage self,
    address beneficiary,
    uint256 index
  ) public view returns (uint256, uint256) {
    VestingInfo storage vestingInfo = getVestingInfo(self, beneficiary, index);
    
    if(vestingInfo.totalClaimed == vestingInfo.amount) {
      return (0, 0);
    }

    // For vesting created with a future start date, that hasn't been reached, return 0, 0
    if (block.timestamp < getCliff(self)) {
      return (0, 0);
    }

    uint256 vestingDuration = getVestingDuration(self);
    uint256 elapsedPeriod = block.timestamp - vestingInfo.startTime;
    uint256 periodToVest = elapsedPeriod - vestingInfo.periodClaimed;

    // If over vesting duration, all tokens vested
    if(elapsedPeriod >= vestingDuration) {
      uint256 amountToVest = vestingInfo.amount - vestingInfo.totalClaimed;
      return (periodToVest, amountToVest);
    } else {
      uint256 amountToVest = (periodToVest * vestingInfo.amount) / vestingDuration;
      return (periodToVest, amountToVest);
    }
  }
}
