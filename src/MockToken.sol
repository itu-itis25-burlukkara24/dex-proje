// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
    
    // Test için kolaylık fonksiyonu - herkes kendine token mint edebilir
    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}

