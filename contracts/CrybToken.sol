// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CrybToken is Ownable, ERC20 {
  uint256 constant private TAX_BASE = 10_000;
  uint256 constant MILLION = 1_000_000 * 10**uint256(18);
  uint256 public tax;
  address public treasury;

  mapping (address => bool) public isExluded;

  event TaxChanged(uint256 oldTax, uint256 newTax);
  event TreasuryChanged(address oldTreasury, address newTreasury);
  
  constructor(
    uint256 _tax,
    address _treasury
  ) ERC20('Cryb Token', 'CRYB') {
    _mint(msg.sender, 1000 * MILLION);
    
    setTax(_tax);
    setTreasury(_treasury);
  }

  function setTax(uint256 _tax) public onlyOwner {
    emit TaxChanged(tax, _tax);
    tax = _tax;
  }

  function setTreasury(address _treasury) public onlyOwner {
    emit TreasuryChanged(treasury, _treasury);
    treasury = _treasury;
  }

  function include(address account) external onlyOwner {
    isExluded[account] = false;
  }

  function exclude(address account) external onlyOwner {
    isExluded[account] = true;
  }

  function _transfer(
    address sender,
    address recipient,
    uint256 amount
  ) internal override {
    if(isExluded[sender]) {
      // send the full amount if sender is exlcuded
      super._transfer(sender, recipient, amount);
    } else {
      uint256 taxedAmount = (amount * tax) / TAX_BASE;
      // send to treasury
      super._transfer(sender, treasury, taxedAmount);
      // send the remaining amount to the recipient
      super._transfer(sender, recipient, amount - taxedAmount);
    }
  }

  function tokenRescue(
    IERC20 token,
    address recipient,
    uint256 amount
  ) onlyOwner external {
    token.transfer(recipient, amount);
  }
}
