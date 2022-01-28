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

contract CrybCrowdsale is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  using SafeERC20Upgradeable for IERC20Upgradeable;
  using Vesting for Vesting.State;

  Vesting.State private vestingState;
  IERC20Upgradeable public token;
  address public treasury;
  // How many token units a buyer gets per wei
  uint256 public rate;
  uint256 public maxAllocation;
  uint256 public totalRaised;
  uint256 public totalSold;

  uint256 public startTime;
  uint256 public endTime;

  uint256 public availableForSale;

  mapping (address => uint256) public userAmount;

  event RateChanged(uint256 oldRate, uint256 newRate);
  event MaxAllocationChanged(uint256 oldMaxAllocation, uint256 newMaxAllocation);
  event Buy(address indexed buyer, uint256 amount, uint256 tokenReceivable);
  event Claimed(address indexed buyer, uint256 vestedAmount);

  function initialize(
    IERC20Upgradeable _token,
    address _treasury,
    uint256 _rate,
    uint256 _maxAllocation,
    uint256 _availableForSale,
    uint256 _startTime,
    uint256 _endTime,
    uint256 _vestingStartDate,
    uint256 _vestingDuration,
    uint256 _cliff
  ) public initializer {
    __Ownable_init();
    __ReentrancyGuard_init();
    __Pausable_init();

    token = _token;
    treasury = _treasury;

    setRate(_rate);
    setAvailableForSale(_availableForSale);
    setMaxAllocation(_maxAllocation);
    setTs(_startTime, _endTime);

    vestingState.initialize(
      _vestingStartDate,
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

  function setParams(
    uint256 _startTime,
    uint256 _endTime,
    uint256 _rate,
    uint256 _availableForSale,
    uint256 _maxAllocation
  ) public onlyOwner {
    setTs(_startTime, _endTime);
    setRate(_rate);
    setAvailableForSale(_availableForSale);
    setMaxAllocation(_maxAllocation);
  }

  function setRate(uint256 _rate) public onlyOwner {
    emit RateChanged(rate, _rate);
    rate = _rate;
  }

  function setMaxAllocation(uint256 _maxAllocation) public onlyOwner {
    emit MaxAllocationChanged(maxAllocation, _maxAllocation);
    maxAllocation = _maxAllocation;
  }

  function setAvailableForSale(uint256 _availableForSale) public onlyOwner {
    availableForSale = _availableForSale;
  }

  function setTs(
    uint256 _startTime,
    uint256 _endTime
  ) public onlyOwner {
    require(_startTime < _endTime, "presale start > endTime");

    startTime = _startTime;
    endTime = _endTime;
  }

  function whitelist(
    address[] memory privInvestors,
    uint256[] memory amounts
  ) external onlyOwner {
    for (uint256 i = 0; i < privInvestors.length; i++) {
      // presale startime is also the start time for the whitelisted user vested positions
      vestingState.addBeneficiary(privInvestors[i], amounts[i]);
    }
  }

  function _buy() private returns(uint256) {
    require(msg.value > 0, "cannot accept 0");

    uint256 tokenReceivable = msg.value * rate;
    totalRaised += msg.value;
    totalSold += tokenReceivable;
    require(totalSold <= availableForSale, "sold out");

    sendFunds();

    emit Buy(_msgSender(), msg.value, tokenReceivable);

    return tokenReceivable;
  }

  function preSale() external payable nonReentrant whenNotPaused {
    require(block.timestamp >= startTime, "presale not started");
    require(block.timestamp < endTime, "presale ended");

    uint256 tokenReceivable = _buy();
    userAmount[_msgSender()] += tokenReceivable;
    require(userAmount[_msgSender()] <= maxAllocation, "max allocation violation");

    // vest the tokenReceivable
    vestingState.addBeneficiary(_msgSender(), tokenReceivable);
  }

  function withdrawRemaining() external onlyOwner {
    token.safeTransfer(treasury, availableForSale - totalSold);
  }

  function sendFunds() private {
    (bool success, ) = payable(treasury).call{value: msg.value}("");
    require(success, "transfer failed");
  }

  function vestingCount(address beneficiary) public view returns (uint256) {
    return vestingState.vestingCount(beneficiary);
  }

  function getVestingInfo(
    address beneficiary,
    uint256 index
  ) external view returns(Vesting.VestingInfo memory) {
    return vestingState.getVestingInfo(beneficiary, index);
  }

  function getTokenReleaseInfo(address beneficiary, uint256 index) public view returns (uint256, uint256) {
    return vestingState.getTokenReleaseInfo(beneficiary, index);
  }

  // allow users claim vested tokens
  function release(uint256 index) public whenNotPaused {
    uint256 vestedAmount = vestingState.release(_msgSender(), index);

    if(vestedAmount > 0) {
      token.safeTransfer(_msgSender(), vestedAmount);

      emit Claimed(_msgSender(), vestedAmount);
    }
  }

  // helper to release multiple vesting position in one go
  function releaseAll() external whenNotPaused {
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
    require(tokenToRescue != token, "cannot rescue offering token");

    tokenToRescue.safeTransfer(recipient, amount);
  }
}
