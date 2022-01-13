// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20.sol";

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

  function _transfer(
    address sender,
    address recipient,
    uint256 amount
  ) internal override {
    require(sender != address(0), "ERC20: transfer from the zero address");
    require(recipient != address(0), "ERC20: transfer to the zero address");

    uint256 taxedAmount;
    uint256 totalReceived;

    if(isExluded[sender]) {
      // send the full amount if sender is exlcuded
      totalReceived = amount;
    } else {
      taxedAmount = (amount * tax) / TAX_BASE;
      totalReceived = amount - taxedAmount;
    }

    uint256 senderBalance = _balances[sender];
    require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
    unchecked {
      _balances[sender] = senderBalance - amount;
    }
    _balances[recipient] += totalReceived;

    if(taxedAmount > 0) {
      _balances[treasury] += taxedAmount;
    }

    emit Transfer(sender, recipient, amount);
  }

  function tokenRescue(
    IERC20 token,
    address recipient,
    uint256 amount
  ) onlyOwner external {
    token.transfer(recipient, amount);
  }
}
