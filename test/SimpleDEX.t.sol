// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/SimpleDEX.sol";
import "../src/MockToken.sol";

contract SimpleDEXTest is Test {
    SimpleDEX public dex;
    MockToken public intelligence;
    MockToken public faith;
    
    address public user = address(1);
    
    function setUp() public {
        intelligence = new MockToken("Intelligence", "INT", 1000000 * 10**18);
        faith = new MockToken("Faith", "FTH", 1000000 * 10**18);
        dex = new SimpleDEX(address(intelligence), address(faith));
        
        // Kullanıcıya token gönder
        intelligence.transfer(user, 10000 * 10**18);
        faith.transfer(user, 10000 * 10**18);
    }
    
    function testAddLiquidity() public {
        vm.startPrank(user);
        
        uint256 amountIntelligence = 1000 * 10**18;
        uint256 amountFaith = 2000 * 10**18;
        
        intelligence.approve(address(dex), amountIntelligence);
        faith.approve(address(dex), amountFaith);
        
        dex.addLiquidity(amountIntelligence, amountFaith);
        
        assertEq(intelligence.balanceOf(address(dex)), amountIntelligence);
        assertEq(faith.balanceOf(address(dex)), amountFaith);
        
        vm.stopPrank();
    }
    
    function testSwap() public {
        vm.startPrank(user);
        
        // Önce likidite ekle
        uint256 amountIntelligence = 1000 * 10**18;
        uint256 amountFaith = 2000 * 10**18;
        
        intelligence.approve(address(dex), amountIntelligence);
        faith.approve(address(dex), amountFaith);
        dex.addLiquidity(amountIntelligence, amountFaith);
        
        // Swap yap
        uint256 swapAmount = 100 * 10**18;
        intelligence.approve(address(dex), swapAmount);
        dex.swap(address(intelligence), swapAmount);
        
        vm.stopPrank();
    }
}

