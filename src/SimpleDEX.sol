// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract SimpleDEX {
    IERC20 public tokenA;
    IERC20 public tokenB;
    
    uint256 public reserveA;
    uint256 public reserveB;
    
    mapping(address => uint256) public liquidityTokens;
    uint256 public totalLiquidityTokens;
    
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(address indexed user, address indexed tokenIn, uint256 amountIn, address indexed tokenOut, uint256 amountOut);
    
    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }
    
    // Uniswap V2 mantığı: x * y = k (constant product formula)
    function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256 liquidity) {
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");
        
        // İlk likidite ekleme
        if (totalLiquidityTokens == 0) {
            liquidity = sqrt(amountA * amountB);
        } else {
            // Mevcut oranı koru
            uint256 liquidityA = (amountA * totalLiquidityTokens) / reserveA;
            uint256 liquidityB = (amountB * totalLiquidityTokens) / reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
        }
        
        require(liquidity > 0, "Insufficient liquidity minted");
        
        // Token transferleri
        require(tokenA.transferFrom(msg.sender, address(this), amountA), "TokenA transfer failed");
        require(tokenB.transferFrom(msg.sender, address(this), amountB), "TokenB transfer failed");
        
        // Rezervleri güncelle
        reserveA += amountA;
        reserveB += amountB;
        
        // Likidite tokenlarını güncelle
        liquidityTokens[msg.sender] += liquidity;
        totalLiquidityTokens += liquidity;
        
        emit LiquidityAdded(msg.sender, amountA, amountB, liquidity);
    }
    
    function removeLiquidity(uint256 liquidity) external returns (uint256 amountA, uint256 amountB) {
        require(liquidity > 0, "Liquidity must be greater than 0");
        require(liquidityTokens[msg.sender] >= liquidity, "Insufficient liquidity");
        
        // Kaldırılacak token miktarlarını hesapla
        amountA = (liquidity * reserveA) / totalLiquidityTokens;
        amountB = (liquidity * reserveB) / totalLiquidityTokens;
        
        require(amountA > 0 && amountB > 0, "Insufficient reserves");
        
        // Likidite tokenlarını güncelle
        liquidityTokens[msg.sender] -= liquidity;
        totalLiquidityTokens -= liquidity;
        
        // Rezervleri güncelle
        reserveA -= amountA;
        reserveB -= amountB;
        
        // Token transferleri
        require(tokenA.transfer(msg.sender, amountA), "TokenA transfer failed");
        require(tokenB.transfer(msg.sender, amountB), "TokenB transfer failed");
        
        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidity);
    }
    
    function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than 0");
        
        IERC20 tokenInContract;
        IERC20 tokenOutContract;
        uint256 reserveIn;
        uint256 reserveOut;
        
        if (tokenIn == address(tokenA)) {
            tokenInContract = tokenA;
            tokenOutContract = tokenB;
            reserveIn = reserveA;
            reserveOut = reserveB;
        } else if (tokenIn == address(tokenB)) {
            tokenInContract = tokenB;
            tokenOutContract = tokenA;
            reserveIn = reserveB;
            reserveOut = reserveA;
        } else {
            revert("Invalid token");
        }
        
        // Uniswap V2 formülü: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
        // %0.3 fee eklenebilir ama basitlik için fee yok
        amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
        
        require(amountOut > 0, "Insufficient output amount");
        require(reserveOut >= amountOut, "Insufficient reserves");
        
        // Token transferleri
        require(tokenInContract.transferFrom(msg.sender, address(this), amountIn), "Token transfer failed");
        require(tokenOutContract.transfer(msg.sender, amountOut), "Token transfer failed");
        
        // Rezervleri güncelle
        if (tokenIn == address(tokenA)) {
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
        }
        
        emit Swap(msg.sender, tokenIn, amountIn, address(tokenOutContract), amountOut);
    }
    
    function getReserves() external view returns (uint256 _reserveA, uint256 _reserveB) {
        return (reserveA, reserveB);
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



