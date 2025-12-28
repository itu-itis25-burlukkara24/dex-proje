// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    address public owner;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        owner = msg.sender;
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
    
    // Sadece owner token mint edebilir
    function mint(uint256 amount) external {
        require(msg.sender == owner, "Only owner can mint");
        _mint(msg.sender, amount);
    }
    
    // Sadece owner başkasına token basabilir (Setup için)
    function mintTo(address to, uint256 amount) external {
        require(msg.sender == owner, "Only owner can mint");
        _mint(to, amount);
    }
}

