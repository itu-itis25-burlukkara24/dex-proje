import { createWalletClient, createPublicClient, http, formatEther, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { anvil } from 'viem/chains';
import inquirer from 'inquirer';
import dotenv from 'dotenv';

dotenv.config();

// Anvil varsayılan private key (Foundry'nin varsayılan hesabı)
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// Anvil varsayılan RPC URL
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

// Kontrat adresleri (deploy edildikten sonra buraya yazılacak)
let intelligenceAddress = process.env.INTELLIGENCE_ADDRESS || process.env.TOKEN_A_ADDRESS;
let faithAddress = process.env.FAITH_ADDRESS || process.env.TOKEN_B_ADDRESS;
let dexAddress = process.env.DEX_ADDRESS;

// Viem client'ları
const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({
    chain: anvil,
    transport: http(RPC_URL)
});

const walletClient = createWalletClient({
    account,
    chain: anvil,
    transport: http(RPC_URL)
});

// ERC20 ABI (basit versiyon)
const ERC20_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    }
];

// DEX ABI
const DEX_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "amountA", "type": "uint256"},
            {"internalType": "uint256", "name": "amountB", "type": "uint256"}
        ],
        "name": "addLiquidity",
        "outputs": [{"internalType": "uint256", "name": "liquidity", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "liquidity", "type": "uint256"}],
        "name": "removeLiquidity",
        "outputs": [
            {"internalType": "uint256", "name": "amountA", "type": "uint256"},
            {"internalType": "uint256", "name": "amountB", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "tokenIn", "type": "address"},
            {"internalType": "uint256", "name": "amountIn", "type": "uint256"}
        ],
        "name": "swap",
        "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getReserves",
        "outputs": [
            {"internalType": "uint256", "name": "_reserveA", "type": "uint256"},
            {"internalType": "uint256", "name": "_reserveB", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "provider", "type": "address"}],
        "name": "getLiquidity",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

async function getBalance(tokenAddress, userAddress) {
    try {
        const balance = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress]
        });
        return balance;
    } catch (error) {
        console.error('Bakiye okuma hatası:', error.message);
        return 0n;
    }
}

async function getTokenSymbol(tokenAddress) {
    try {
        const symbol = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'symbol'
        });
        return symbol;
    } catch (error) {
        return 'TOKEN';
    }
}

async function showBalances() {
    console.log('\n=== Bakiyeler ===');
    
    if (!intelligenceAddress || !faithAddress) {
        console.log('❌ Token adresleri tanımlı değil! Lütfen .env dosyasını kontrol edin.');
        return;
    }
    
    const userAddress = account.address;
    const intelligenceSymbol = await getTokenSymbol(intelligenceAddress);
    const faithSymbol = await getTokenSymbol(faithAddress);
    
    const intelligenceBalance = await getBalance(intelligenceAddress, userAddress);
    const faithBalance = await getBalance(faithAddress, userAddress);
    
    console.log(`\n${intelligenceSymbol} (Intelligence) Bakiyesi: ${formatEther(intelligenceBalance)}`);
    console.log(`${faithSymbol} (Faith) Bakiyesi: ${formatEther(faithBalance)}`);
    
    if (dexAddress) {
        const reserves = await publicClient.readContract({
            address: dexAddress,
            abi: DEX_ABI,
            functionName: 'getReserves'
        });
        console.log(`\nSouls DEX Rezervleri:`);
        console.log(`${intelligenceSymbol} (Intelligence): ${formatEther(reserves[0])}`);
        console.log(`${faithSymbol} (Faith): ${formatEther(reserves[1])}`);
        
        const liquidity = await publicClient.readContract({
            address: dexAddress,
            abi: DEX_ABI,
            functionName: 'getLiquidity',
            args: [userAddress]
        });
        console.log(`\nSizin Likidite Tokenlarınız: ${formatEther(liquidity)}`);
    }
    
    console.log(`\nCüzdan Adresiniz: ${userAddress}`);
}

async function addLiquidity() {
    if (!intelligenceAddress || !faithAddress || !dexAddress) {
        console.log('❌ Kontrat adresleri tanımlı değil!');
        return;
    }
    
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'amountIntelligence',
            message: 'Intelligence (INT) miktarı (ether cinsinden):',
            validate: (input) => {
                const num = parseFloat(input);
                return num > 0 || 'Miktar 0\'dan büyük olmalı';
            }
        },
        {
            type: 'input',
            name: 'amountFaith',
            message: 'Faith (FTH) miktarı (ether cinsinden):',
            validate: (input) => {
                const num = parseFloat(input);
                return num > 0 || 'Miktar 0\'dan büyük olmalı';
            }
        }
    ]);
    
    try {
        const amountIntelligence = parseEther(answers.amountIntelligence);
        const amountFaith = parseEther(answers.amountFaith);
        
        console.log('\n⏳ İşlem gönderiliyor...');
        
        // Önce approve işlemleri
        const approveIntelligenceHash = await walletClient.writeContract({
            address: intelligenceAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [dexAddress, amountIntelligence]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveIntelligenceHash });
        console.log('✅ Intelligence (INT) approve edildi');
        
        const approveFaithHash = await walletClient.writeContract({
            address: faithAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [dexAddress, amountFaith]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveFaithHash });
        console.log('✅ Faith (FTH) approve edildi');
        
        // Likidite ekle
        const hash = await walletClient.writeContract({
            address: dexAddress,
            abi: DEX_ABI,
            functionName: 'addLiquidity',
            args: [amountIntelligence, amountFaith]
        });
        
        console.log(`⏳ İşlem hash: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
            console.log('✅ Likidite başarıyla eklendi!');
        } else {
            console.log('❌ İşlem başarısız oldu');
        }
    } catch (error) {
        console.error('❌ Hata:', error.message);
    }
}

async function removeLiquidity() {
    if (!dexAddress) {
        console.log('❌ DEX adresi tanımlı değil!');
        return;
    }
    
    const userAddress = account.address;
    const liquidity = await publicClient.readContract({
        address: dexAddress,
        abi: DEX_ABI,
        functionName: 'getLiquidity',
        args: [userAddress]
    });
    
    if (liquidity === 0n) {
        console.log('❌ Likidite tokenınız yok!');
        return;
    }
    
    console.log(`\nMevcut likidite tokenlarınız: ${formatEther(liquidity)}`);
    
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'amount',
            message: 'Kaldırmak istediğiniz likidite miktarı (ether cinsinden):',
            validate: (input) => {
                const num = parseFloat(input);
                const max = parseFloat(formatEther(liquidity));
                return num > 0 && num <= max || `Miktar 0 ile ${max} arasında olmalı`;
            }
        }
    ]);
    
    try {
        const amount = parseEther(answers.amount);
        
        console.log('\n⏳ İşlem gönderiliyor...');
        
        const hash = await walletClient.writeContract({
            address: dexAddress,
            abi: DEX_ABI,
            functionName: 'removeLiquidity',
            args: [amount]
        });
        
        console.log(`⏳ İşlem hash: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
            console.log('✅ Likidite başarıyla kaldırıldı!');
        } else {
            console.log('❌ İşlem başarısız oldu');
        }
    } catch (error) {
        console.error('❌ Hata:', error.message);
    }
}

async function swap() {
    if (!intelligenceAddress || !faithAddress || !dexAddress) {
        console.log('❌ Kontrat adresleri tanımlı değil!');
        return;
    }
    
    const intelligenceSymbol = await getTokenSymbol(intelligenceAddress);
    const faithSymbol = await getTokenSymbol(faithAddress);
    
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'tokenIn',
            message: 'Hangi tokenı takas etmek istiyorsunuz?',
            choices: [
                { name: `${intelligenceSymbol} (Intelligence) -> ${faithSymbol} (Faith)`, value: intelligenceAddress },
                { name: `${faithSymbol} (Faith) -> ${intelligenceSymbol} (Intelligence)`, value: faithAddress }
            ]
        },
        {
            type: 'input',
            name: 'amount',
            message: 'Takas miktarı (ether cinsinden):',
            validate: (input) => {
                const num = parseFloat(input);
                return num > 0 || 'Miktar 0\'dan büyük olmalı';
            }
        }
    ]);
    
    try {
        const amount = parseEther(answers.amount);
        
        console.log('\n⏳ İşlem gönderiliyor...');
        
        // Önce approve
        const approveHash = await walletClient.writeContract({
            address: answers.tokenIn,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [dexAddress, amount]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log('✅ Token approve edildi');
        
        // Swap işlemi
        const hash = await walletClient.writeContract({
            address: dexAddress,
            abi: DEX_ABI,
            functionName: 'swap',
            args: [answers.tokenIn, amount]
        });
        
        console.log(`⏳ İşlem hash: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
            console.log('✅ Swap başarıyla tamamlandı!');
        } else {
            console.log('❌ İşlem başarısız oldu');
        }
    } catch (error) {
        console.error('❌ Hata:', error.message);
    }
}

async function transfer() {
    if (!intelligenceAddress || !faithAddress) {
        console.log('❌ Token adresleri tanımlı değil!');
        return;
    }
    
    const intelligenceSymbol = await getTokenSymbol(intelligenceAddress);
    const faithSymbol = await getTokenSymbol(faithAddress);
    const userAddress = account.address;
    
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'token',
            message: 'Hangi tokenı transfer etmek istiyorsunuz?',
            choices: [
                { name: `${intelligenceSymbol} (Intelligence)`, value: intelligenceAddress },
                { name: `${faithSymbol} (Faith)`, value: faithAddress }
            ]
        },
        {
            type: 'input',
            name: 'to',
            message: 'Alıcı adresi:',
            validate: (input) => {
                if (!/^0x[a-fA-F0-9]{40}$/.test(input)) {
                    return 'Geçerli bir Ethereum adresi girin (0x ile başlamalı, 42 karakter)';
                }
                return true;
            }
        },
        {
            type: 'input',
            name: 'amount',
            message: 'Transfer miktarı (ether cinsinden):',
            validate: async (input) => {
                const num = parseFloat(input);
                if (num <= 0) {
                    return 'Miktar 0\'dan büyük olmalı';
                }
                return true;
            }
        }
    ]);
    
    try {
        const amount = parseEther(answers.amount);
        const tokenAddress = answers.token;
        const tokenSymbol = tokenAddress === intelligenceAddress ? intelligenceSymbol : faithSymbol;
        
        // Bakiye kontrolü
        const balance = await getBalance(tokenAddress, userAddress);
        if (balance < amount) {
            console.log(`❌ Yetersiz bakiye! Mevcut: ${formatEther(balance)} ${tokenSymbol}`);
            return;
        }
        
        console.log('\n⏳ İşlem gönderiliyor...');
        
        const hash = await walletClient.writeContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [answers.to, amount]
        });
        
        console.log(`⏳ İşlem hash: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
            console.log(`✅ ${formatEther(amount)} ${tokenSymbol} başarıyla ${answers.to} adresine transfer edildi!`);
        } else {
            console.log('❌ İşlem başarısız oldu');
        }
    } catch (error) {
        console.error('❌ Hata:', error.message);
    }
}

async function main() {
    console.log('🔥 Souls DEX\'e Hoş Geldiniz! 🔥');
    console.log(`📡 Anvil RPC: ${RPC_URL}`);
    console.log(`👤 Cüzdan: ${account.address}\n`);
    
    while (true) {
        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Ne yapmak istersiniz?',
                choices: [
                    'Likidite Ekle',
                    'Likidite Kaldır',
                    'Swap Yap',
                    'Transfer Yap',
                    'Bakiyeleri Gör',
                    'Çıkış'
                ]
            }
        ]);
        
        switch (answer.action) {
            case 'Likidite Ekle':
                await addLiquidity();
                break;
            case 'Likidite Kaldır':
                await removeLiquidity();
                break;
            case 'Swap Yap':
                await swap();
                break;
            case 'Transfer Yap':
                await transfer();
                break;
            case 'Bakiyeleri Gör':
                await showBalances();
                break;
            case 'Çıkış':
                console.log('👋 Görüşmek üzere!');
                process.exit(0);
        }
        
        console.log('\n' + '='.repeat(50) + '\n');
    }
}

main().catch(console.error);

