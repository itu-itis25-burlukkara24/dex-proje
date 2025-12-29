// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SoulsDEX is ReentrancyGuard {
    IERC20 public intelligence;
    IERC20 public faith;
    
    uint256 public reserveIntelligence;
    uint256 public reserveFaith;
    
    mapping(address => uint256) public liquidityTokens;
    uint256 public totalLiquidityTokens;
    
    event LiquidityAdded(address indexed provider, uint256 amountIntelligence, uint256 amountFaith, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint256 amountIntelligence, uint256 amountFaith, uint256 liquidity);
    event Swap(address indexed user, address indexed tokenIn, uint256 amountIn, address indexed tokenOut, uint256 amountOut);
    
    constructor(address _intelligence, address _faith) {
        intelligence = IERC20(_intelligence);
        faith = IERC20(_faith);
    }
    
    // Uniswap V2 mantığı: x * y = k (constant product formula)
    function addLiquidity(uint256 amountIntelligence, uint256 amountFaith) external nonReentrant returns (uint256 liquidity) {
        require(amountIntelligence > 0 && amountFaith > 0, "Amounts must be greater than 0");
        
        // İlk likidite ekleme
        if (totalLiquidityTokens == 0) {
            liquidity = sqrt(amountIntelligence * amountFaith);
        } else {
            // Orantılı likidite kontrolü - %5 tolerans ile
            uint256 amountFaithOptimal = (amountIntelligence * reserveFaith) / reserveIntelligence;
            uint256 tolerance = amountFaithOptimal / 20; // %5 tolerans
            require(
                amountFaith >= amountFaithOptimal - tolerance && 
                amountFaith <= amountFaithOptimal + tolerance, 
                "Oran uyumsuz! Havuz oranini koru"
            );
            
            uint256 liquidityIntelligence = (amountIntelligence * totalLiquidityTokens) / reserveIntelligence;
            uint256 liquidityFaith = (amountFaith * totalLiquidityTokens) / reserveFaith;
            liquidity = liquidityIntelligence < liquidityFaith ? liquidityIntelligence : liquidityFaith;
        }
        
        require(liquidity > 0, "Insufficient liquidity minted");
        
        // Token transferleri
        require(intelligence.transferFrom(msg.sender, address(this), amountIntelligence), "Intelligence transfer failed");
        require(faith.transferFrom(msg.sender, address(this), amountFaith), "Faith transfer failed");
        
        // Rezervleri güncelle
        reserveIntelligence += amountIntelligence;
        reserveFaith += amountFaith;
        
        // Likidite tokenlarını güncelle
        liquidityTokens[msg.sender] += liquidity;
        totalLiquidityTokens += liquidity;
        
        emit LiquidityAdded(msg.sender, amountIntelligence, amountFaith, liquidity);
    }
    
    function removeLiquidity(uint256 liquidity) external returns (uint256 amountIntelligence, uint256 amountFaith) {
        require(liquidity > 0, "Liquidity must be greater than 0");
        require(liquidityTokens[msg.sender] >= liquidity, "Insufficient liquidity");
        
        // Kaldırılacak token miktarlarını hesapla
        amountIntelligence = (liquidity * reserveIntelligence) / totalLiquidityTokens;
        amountFaith = (liquidity * reserveFaith) / totalLiquidityTokens;
        
        require(amountIntelligence > 0 && amountFaith > 0, "Insufficient reserves");
        
        // Likidite tokenlarını güncelle
        liquidityTokens[msg.sender] -= liquidity;
        totalLiquidityTokens -= liquidity;
        
        // Rezervleri güncelle
        reserveIntelligence -= amountIntelligence;
        reserveFaith -= amountFaith;
        
        // Token transferleri
        require(intelligence.transfer(msg.sender, amountIntelligence), "Intelligence transfer failed");
        require(faith.transfer(msg.sender, amountFaith), "Faith transfer failed");
        
        emit LiquidityRemoved(msg.sender, amountIntelligence, amountFaith, liquidity);
    }
    
    function swap(address tokenIn, uint256 amountIn) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than 0");
        
        IERC20 tokenInContract;
        IERC20 tokenOutContract;
        uint256 reserveIn;
        uint256 reserveOut;
        
        if (tokenIn == address(intelligence)) {
            tokenInContract = intelligence;
            tokenOutContract = faith;
            reserveIn = reserveIntelligence;
            reserveOut = reserveFaith;
        } else if (tokenIn == address(faith)) {
            tokenInContract = faith;
            tokenOutContract = intelligence;
            reserveIn = reserveFaith;
            reserveOut = reserveIntelligence;
        } else {
            revert("Invalid token");
        }
        
        // %1 fee mekanizması (990/1000 = %99)
        uint256 amountInWithFee = amountIn * 990;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
        
        require(amountOut > 0, "Insufficient output amount");
        require(reserveOut >= amountOut, "Insufficient reserves");
        
        // Token transferleri
        require(tokenInContract.transferFrom(msg.sender, address(this), amountIn), "Token transfer failed");
        require(tokenOutContract.transfer(msg.sender, amountOut), "Token transfer failed");
        
        // Rezervleri güncelle
        if (tokenIn == address(intelligence)) {
            reserveIntelligence += amountIn;
            reserveFaith -= amountOut;
        } else {
            reserveFaith += amountIn;
            reserveIntelligence -= amountOut;
        }
        
        emit Swap(msg.sender, tokenIn, amountIn, address(tokenOutContract), amountOut);
    }
    
    function getReserves() external view returns (uint256 _reserveIntelligence, uint256 _reserveFaith) {
        return (reserveIntelligence, reserveFaith);
    }
    
    function getLiquidity(address provider) external view returns (uint256) {
        return liquidityTokens[provider];
    }
    
    // Basit karekök hesaplama (ilk likidite için)
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}


