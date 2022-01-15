// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./libs/Vesting.sol";

import "hardhat/console.sol";

contract CrybCrowdsale is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  using SafeERC20Upgradeable for IERC20Upgradeable;
  using Vesting for Vesting.State;

  Vesting.State private vestingState;
  IERC20Upgradeable public token;
  address public treasury;
  // How many token units a buyer gets per wei
  uint256 public rate;
  uint256 public totalRaised;
  uint256 public totalSold;

  // start and end timestamps
  uint256 public startTime;
  uint256 public endTime;
  uint256 public availableForSale;

  event RateChanged(uint256 oldRate, uint256 newRate);
  event Buy(address indexed buyer, uint256 amount, uint256 tokenReceivable);
  event Claimed(address indexed buyer, uint256 vestedAmount);

  function initialize(
    IERC20Upgradeable _token,
    address _treasury,
    uint256 _rate,
    uint256 _startTime,
    uint256 _endTime,
    uint256 _availableForSale,
    uint256 _vestingDuration,
    uint256 _cliff
  ) public initializer {
    __Ownable_init();
    __ReentrancyGuard_init();
    __Pausable_init();

    token = _token;
    treasury = _treasury;
    availableForSale = _availableForSale;
    
    setRate(_rate);
    setTs(_startTime, _endTime);

    vestingState.initialize(
      _vestingDuration,
      _cliff
    );
  }

  function pause() public onlyOwner {
    _pause();
  }

  function unpause() public onlyOwner {
    _unpause();
  }

  /// To authorize the owner to upgrade the contract we implement 
  /// _authorizeUpgrade with the onlyOwner modifier.
  function _authorizeUpgrade(address) internal override onlyOwner {}

  function setRate(uint256 _rate) public onlyOwner {
    emit RateChanged(rate, _rate);
    rate = _rate;
  }

  function setTs(uint256 _startTime, uint256 _endTime) public onlyOwner {
    require(_startTime < _endTime, "start > endTime");

    startTime = _startTime;
    endTime = _endTime;
  }

  function whitelist(
    address[] memory privInvestors,
    uint256[] memory amounts
  ) external onlyOwner {
    for (uint256 i = 0; i < privInvestors.length; i++) {
      vestingState.addBeneficiary(privInvestors[i], startTime, amounts[i]);
    }
  }

  function buy() external payable nonReentrant whenNotPaused {
    require(msg.value > 0, "cannot accept 0");
    require(block.timestamp >= startTime, "sale not started");
    require(block.timestamp < endTime, "sale ended");

    uint256 tokenReceivable = msg.value * rate;
    require(totalSold + tokenReceivable <= availableForSale, "sold out");
    
    totalRaised += msg.value;
    totalSold += tokenReceivable;

    processPurchase(tokenReceivable);
    sendFunds();

    emit Buy(_msgSender(), msg.value, tokenReceivable);
  }

  function processPurchase(uint256 tokenReceivable) private {
    // vest the tokenReceivable
    vestingState.addBeneficiary(_msgSender(), block.timestamp, tokenReceivable);
  }

  function withdrawRemaining() external onlyOwner {
    require(block.timestamp >= endTime, "sale not finished yet");
    
    token.safeTransfer(treasury, availableForSale - totalSold);
  }

  function sendFunds() private {
    (bool success, ) = payable(treasury).call{value: msg.value}("");
    require(success, "transfer failed");
  }

  function vestingCount(address beneficiary) public view returns (uint256) {
    return vestingState.vestingCount(beneficiary);
  }

  // allow users claim vested tokens
  function release(uint256 index) public {
    // release both offering and refund tokens
    uint256 vestedAmount = vestingState.release(_msgSender(), index);
    token.safeTransfer(_msgSender(), vestedAmount);

    emit Claimed(_msgSender(), vestedAmount);
  }

  // helper to release multiple vesting position in one go
  function releaseAll() external {
    uint256 count = vestingCount(_msgSender());

    for (uint256 i = 0; i < count; i++) {
      release(i);
    }
  }

  function rescueToken(
    IERC20Upgradeable tokenToRescue,
    address recipient,
    uint256 amount
  ) external onlyOwner {
    require(block.timestamp >= endTime, "sale not finished yet");

    tokenToRescue.safeTransfer(recipient, amount);
  }
}
