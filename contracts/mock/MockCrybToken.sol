//SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "../token/CrybToken.sol";

contract MockCrybToken is CrybToken {
  constructor(
    uint256 _tax,
    address _treasury
  ) CrybToken(_tax, _treasury) {}


  function transferInternal(
    address from,
    address to,
    uint256 value
  ) public {
    _transfer(from, to, value);
  }

  function approveInternal(
    address owner,
    address spender,
    uint256 value
  ) public {
    _approve(owner, spender, value);
  }
}
