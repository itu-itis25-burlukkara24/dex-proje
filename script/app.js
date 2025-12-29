import { createWalletClient, createPublicClient, http, formatEther, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { anvil } from 'viem/chains';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// CONFIGURATION
// ============================================

const ANVIL_ACCOUNTS = [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
    '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
    '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
    '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
    '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
    '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
    '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6'
];

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

let currentAccountIndex = 0;
let intelligenceAddress = process.env.INTELLIGENCE_ADDRESS;
let faithAddress = process.env.FAITH_ADDRESS;
let soulsDexAddress = process.env.SOULS_DEX_ADDRESS;

// ============================================
// CLIENTS
// ============================================

function getClients() {
    const account = privateKeyToAccount(ANVIL_ACCOUNTS[currentAccountIndex]);

    const walletClient = createWalletClient({
        account,
        chain: anvil,
        transport: http(RPC_URL)
    });

    const publicClient = createPublicClient({
        chain: anvil,
        transport: http(RPC_URL)
    });

    return { walletClient, publicClient, account };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getArtifact(name) {
    const binPath = path.join(__dirname, `../out_solc/${name}.bin`);
    const abiPath = path.join(__dirname, `../out_solc/${name}.abi`);

    const bytecode = '0x' + fs.readFileSync(binPath, 'utf8');
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

    return { abi, bytecode };
}

function calculateLevel(intBalance, fthBalance) {
    const intLevel = Math.floor(Number(formatEther(intBalance)) / 100);
    const fthLevel = Math.floor(Number(formatEther(fthBalance)) / 100);
    return intLevel + fthLevel;
}

function getRank(level) {
    if (level >= 20) return { name: 'Legend', emoji: '🌟' };
    if (level >= 10) return { name: 'Warrior', emoji: '⚔️' };
    return { name: 'Survivor', emoji: '🔪' };
}

function getClass(intLevel, fthLevel) {
    if (intLevel > fthLevel) return { name: 'Büyücü', emoji: '🔮' };
    if (fthLevel > intLevel) return { name: 'Rahip', emoji: '✨' };
    return { name: 'Günahkar', emoji: '😈' };
}

function showBanner() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║                                           ║');
    console.log('║          ⚡ SOULS DEX ⚡                  ║');
    console.log('║       "Sacrifice to Ascend"               ║');
    console.log('║                                           ║');
    console.log('╚═══════════════════════════════════════════╝\n');
}

const ERC20_ABI = [
    {
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "_spender", "type": "address" },
            { "name": "_value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "to", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "to", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "name": "mintTo",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const SOULS_DEX_ABI = [
    {
        "inputs": [
            { "name": "amountIntelligence", "type": "uint256" },
            { "name": "amountFaith", "type": "uint256" }
        ],
        "name": "addLiquidity",
        "outputs": [{ "name": "liquidity", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "tokenIn", "type": "address" },
            { "name": "amountIn", "type": "uint256" }
        ],
        "name": "swap",
        "outputs": [{ "name": "amountOut", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getReserves",
        "outputs": [
            { "name": "_reserveIntelligence", "type": "uint256" },
            { "name": "_reserveFaith", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// ============================================
// DEPLOYMENT FUNCTIONS
// ============================================

async function deploymentFlow() {
    const { walletClient, publicClient, account } = getClients();

    console.log('⚠️  Kontratlar henüz deploy edilmemiş!\n');

    const start = await inquirer.prompt([{
        type: 'confirm',
        name: 'start',
        message: 'Deployment başlasın mı?',
        default: true
    }]);

    if (!start.start) {
        console.log('❌ Deployment iptal edildi.');
        process.exit(0);
    }

    console.log('\n─────────────────────────────────────────\n');
    console.log('🔧 DEPLOYMENT ADIMLARI:\n');

    // STEP 1: Deploy Intelligence
    console.log('ADIM 1: 🧠 Intelligence Token Deploy');
    const intAmount = await inquirer.prompt([{
        type: 'input',
        name: 'amount',
        message: 'Kendi adresine kaç INT basılsın?',
        default: '1000',
        validate: (input) => !isNaN(input) && Number(input) > 0 || 'Geçerli bir sayı girin'
    }]);

    const intelligenceArtifact = getArtifact('src_MockToken_sol_MockToken');
    const hashInt = await walletClient.deployContract({
        abi: intelligenceArtifact.abi,
        bytecode: intelligenceArtifact.bytecode,
        args: ['Intelligence', 'INT', BigInt(intAmount.amount)]
    });
    const receiptInt = await publicClient.waitForTransactionReceipt({ hash: hashInt });
    intelligenceAddress = receiptInt.contractAddress;
    console.log(`✅ Deployed: ${intelligenceAddress} (Blok #${receiptInt.blockNumber})\n`);

    // STEP 2: Deploy Faith
    console.log('ADIM 2: 🙏 Faith Token Deploy');
    const fthAmount = await inquirer.prompt([{
        type: 'input',
        name: 'amount',
        message: 'Kendi adresine kaç FTH basılsın?',
        default: '500',
        validate: (input) => !isNaN(input) && Number(input) > 0 || 'Geçerli bir sayı girin'
    }]);

    const faithArtifact = getArtifact('src_MockToken_sol_MockToken');
    const hashFth = await walletClient.deployContract({
        abi: faithArtifact.abi,
        bytecode: faithArtifact.bytecode,
        args: ['Faith', 'FTH', BigInt(fthAmount.amount)]
    });
    const receiptFth = await publicClient.waitForTransactionReceipt({ hash: hashFth });
    faithAddress = receiptFth.contractAddress;
    console.log(`✅ Deployed: ${faithAddress} (Blok #${receiptFth.blockNumber})\n`);

    // STEP 3: Deploy SoulsDEX
    console.log('ADIM 3: 🔥 SoulsDEX Deploy');
    const soulsDexArtifact = getArtifact('src_SoulsDEX_sol_SoulsDEX');
    const hashDex = await walletClient.deployContract({
        abi: soulsDexArtifact.abi,
        bytecode: soulsDexArtifact.bytecode,
        args: [intelligenceAddress, faithAddress]
    });
    const receiptDex = await publicClient.waitForTransactionReceipt({ hash: hashDex });
    soulsDexAddress = receiptDex.contractAddress;
    console.log(`✅ Deployed: ${soulsDexAddress} (Blok #${receiptDex.blockNumber})\n`);

    // STEP 4: Distribute to other Tarnished
    console.log('ADIM 4: ⚔️  Diğer Tarnished\'lara Ruh Dağıt');
    console.log('→ 9 adrese 500 INT + 500 FTH');

    for (let i = 1; i < ANVIL_ACCOUNTS.length; i++) {
        const targetAccount = privateKeyToAccount(ANVIL_ACCOUNTS[i]);

        const mintIntHash = await walletClient.writeContract({
            address: intelligenceAddress,
            abi: intelligenceArtifact.abi,
            functionName: 'mintTo',
            args: [targetAccount.address, parseEther('500')]
        });
        await publicClient.waitForTransactionReceipt({ hash: mintIntHash });

        const mintFthHash = await walletClient.writeContract({
            address: faithAddress,
            abi: faithArtifact.abi,
            functionName: 'mintTo',
            args: [targetAccount.address, parseEther('500')]
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: mintFthHash });

        console.log(`  ⚔️  Tarnished ${i}: ${targetAccount.address.slice(0, 10)}... (Blok #${receipt.blockNumber})`);
    }
    console.log('✅ Dağıtım tamamlandı!\n');

    // STEP 4.5: Mint extra tokens for founder for initial liquidity
    console.log('💰 Founder için ekstra token mint ediliyor (havuz için)...');

    const mintExtraIntHash = await walletClient.writeContract({
        address: intelligenceAddress,
        abi: intelligenceArtifact.abi,
        functionName: 'mintTo',
        args: [account.address, parseEther('5000')]
    });
    await publicClient.waitForTransactionReceipt({ hash: mintExtraIntHash });

    const mintExtraFthHash = await walletClient.writeContract({
        address: faithAddress,
        abi: faithArtifact.abi,
        functionName: 'mintTo',
        args: [account.address, parseEther('5000')]
    });
    await publicClient.waitForTransactionReceipt({ hash: mintExtraFthHash });
    console.log('✅ Ekstra token mint edildi!\n');

    // STEP 5: Add Initial Liquidity
    console.log('ADIM 5: 💧 Havuza İlk Likidite');
    console.log('→ 5000 INT + 5000 FTH');

    const approveIntHash = await walletClient.writeContract({
        address: intelligenceAddress,
        abi: intelligenceArtifact.abi,
        functionName: 'approve',
        args: [soulsDexAddress, parseEther('5000')]
    });
    await publicClient.waitForTransactionReceipt({ hash: approveIntHash });

    const approveFthHash = await walletClient.writeContract({
        address: faithAddress,
        abi: faithArtifact.abi,
        functionName: 'approve',
        args: [soulsDexAddress, parseEther('5000')]
    });
    await publicClient.waitForTransactionReceipt({ hash: approveFthHash });

    const addLiqHash = await walletClient.writeContract({
        address: soulsDexAddress,
        abi: soulsDexArtifact.abi,
        functionName: 'addLiquidity',
        args: [parseEther('5000'), parseEther('5000')]
    });
    const liqReceipt = await publicClient.waitForTransactionReceipt({ hash: addLiqHash });
    console.log(`✅ Likidite eklendi! (Blok #${liqReceipt.blockNumber})\n`);

    // Save to .env
    const envContent = `RPC_URL=${RPC_URL}
PRIVATE_KEY=${ANVIL_ACCOUNTS[0]}
INTELLIGENCE_ADDRESS=${intelligenceAddress}
FAITH_ADDRESS=${faithAddress}
SOULS_DEX_ADDRESS=${soulsDexAddress}
`;
    fs.writeFileSync(path.join(__dirname, '../.env'), envContent);

    // Save initial stats for ascension tracking
    const statsData = {};
    for (let i = 0; i < ANVIL_ACCOUNTS.length; i++) {
        const acc = privateKeyToAccount(ANVIL_ACCOUNTS[i]);
        statsData[acc.address] = {
            startTime: Date.now(),
            initialINT: i === 0 ? intAmount.amount : '500',
            initialFTH: i === 0 ? fthAmount.amount : '500'
        };
    }
    fs.writeFileSync(path.join(__dirname, '../stats.json'), JSON.stringify(statsData, null, 2));

    console.log('─────────────────────────────────────────\n');
    console.log('🎉 Deployment Tamamlandı!');
    console.log('📝 .env dosyası güncellendi');
    console.log('📊 Yükseliş istatistikleri kaydedildi\n');
    console.log('⚡ Ana menüye geçiliyor...\n');
}

// ============================================
// MAIN MENU FUNCTIONS
// ============================================

async function addLiquidity() {
    const { walletClient, publicClient, account } = getClients();

    console.log('\n=== ⚡ LİKİDİTE EKLE ===\n');

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'intAmount',
            message: 'Intelligence miktarı:',
            validate: (input) => !isNaN(input) && Number(input) > 0 || 'Geçerli bir sayı girin'
        },
        {
            type: 'input',
            name: 'fthAmount',
            message: 'Faith miktarı:',
            validate: (input) => !isNaN(input) && Number(input) > 0 || 'Geçerli bir sayı girin'
        }
    ]);

    try {
        const intAmount = parseEther(answers.intAmount);
        const fthAmount = parseEther(answers.fthAmount);

        console.log('\n⏳ Approve ediliyor...');

        const approveIntHash = await walletClient.writeContract({
            address: intelligenceAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [soulsDexAddress, intAmount]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveIntHash });

        const approveFthHash = await walletClient.writeContract({
            address: faithAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [soulsDexAddress, fthAmount]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveFthHash });

        console.log('⏳ Likidite ekleniyor...');

        const addLiqHash = await walletClient.writeContract({
            address: soulsDexAddress,
            abi: SOULS_DEX_ABI,
            functionName: 'addLiquidity',
            args: [intAmount, fthAmount]
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: addLiqHash });

        console.log(`✅ Likidite eklendi! (Blok #${receipt.blockNumber})\n`);
    } catch (error) {
        console.error('❌ Hata:', error.message, '\n');
    }
}

async function swap() {
    const { walletClient, publicClient, account } = getClients();

    console.log('\n=== ⚔️  SWAP (SACRIFICE) ===\n');

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'tokenIn',
            message: 'Hangi özelliğini feda edeceksin?',
            choices: [
                { name: 'Intelligence → Faith (Bilgeliği feda et)', value: intelligenceAddress },
                { name: 'Faith → Intelligence (İnancı feda et)', value: faithAddress }
            ]
        },
        {
            type: 'input',
            name: 'amount',
            message: 'Fedakarlık miktarı:',
            validate: (input) => !isNaN(input) && Number(input) > 0 || 'Geçerli bir sayı girin'
        }
    ]);

    try {
        const amount = parseEther(answers.amount);

        console.log('\n⏳ Approve ediliyor...');

        const approveHash = await walletClient.writeContract({
            address: answers.tokenIn,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [soulsDexAddress, amount]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        console.log('⏳ Fedakarlık sunuluyor...');

        const swapHash = await walletClient.writeContract({
            address: soulsDexAddress,
            abi: SOULS_DEX_ABI,
            functionName: 'swap',
            args: [answers.tokenIn, amount]
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });

        console.log(`✅ Fedakarlığın kabul edildi! (Blok #${receipt.blockNumber})\n`);
    } catch (error) {
        console.error('❌ Hata:', error.message, '\n');
    }
}

async function transfer() {
    const { walletClient, publicClient, account } = getClients();

    console.log('\n=== 💀 RUH TRANSFERİ ===\n');

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'token',
            message: 'Hangi token?',
            choices: [
                { name: 'Intelligence (INT)', value: intelligenceAddress },
                { name: 'Faith (FTH)', value: faithAddress }
            ]
        },
        {
            type: 'input',
            name: 'to',
            message: 'Alıcı adresi:',
            validate: (input) => input.startsWith('0x') && input.length === 42 || 'Geçerli adres girin'
        },
        {
            type: 'input',
            name: 'amount',
            message: 'Miktar:',
            validate: (input) => !isNaN(input) && Number(input) > 0 || 'Geçerli bir sayı girin'
        }
    ]);

    try {
        const amount = parseEther(answers.amount);

        console.log('\n⏳ Transfer ediliyor...');

        const transferHash = await walletClient.writeContract({
            address: answers.token,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [answers.to, amount]
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });

        console.log(`✅ Transfer tamamlandı! (Blok #${receipt.blockNumber})\n`);
    } catch (error) {
        console.error('❌ Hata:', error.message, '\n');
    }
}

async function mintTokens() {
    if (currentAccountIndex !== 0) {
        console.log('\n❌ Sadece founder mint edebilir!\n');
        return;
    }

    const { walletClient, publicClient, account } = getClients();

    console.log('\n=== 🪙 MINT TOKENS (FOUNDER ONLY) ===\n');

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'token',
            message: 'Hangi token?',
            choices: [
                { name: '🧠 Intelligence (INT)', value: intelligenceAddress },
                { name: '🙏 Faith (FTH)', value: faithAddress }
            ]
        },
        {
            type: 'input',
            name: 'amount',
            message: 'Miktar:',
            validate: (input) => !isNaN(input) && Number(input) > 0 || 'Geçerli bir sayı girin'
        }
    ]);

    try {
        const amount = parseEther(answers.amount);

        console.log('\n⏳ Mint ediliyor...');

        const mintHash = await walletClient.writeContract({
            address: answers.token,
            abi: ERC20_ABI,
            functionName: 'mintTo',
            args: [account.address, amount]
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });

        const tokenName = answers.token === intelligenceAddress ? 'INT' : 'FTH';
        console.log(`✅ ${answers.amount} ${tokenName} mint edildi! (Blok #${receipt.blockNumber})\n`);
    } catch (error) {
        console.error('❌ Hata:', error.message, '\n');
    }
}

async function switchWallet() {
    const { publicClient } = getClients();

    console.log('\n=== 🔄 WALLET DEĞİŞTİR ===\n');
    console.log('⚠️  Private key gereklidir!\n');

    const answer = await inquirer.prompt([{
        type: 'password',
        name: 'privateKey',
        message: 'Private key girin:',
        mask: '*'
    }]);

    const privateKey = answer.privateKey.trim();

    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
        console.log('\n❌ Geçersiz private key!');
        console.log('❌ Format: 0x + 64 hex karakter\n');
        return;
    }

    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    if (!hexPattern.test(privateKey)) {
        console.log('\n❌ Geçersiz private key!');
        console.log('❌ Sadece hex karakterler (0-9, a-f) kullanılabilir\n');
        return;
    }

    const index = ANVIL_ACCOUNTS.indexOf(privateKey);
    if (index === -1) {
        console.log('\n❌ Geçersiz private key!');
        console.log('❌ Sadece Anvil hesapları kullanılabilir\n');
        return;
    }

    currentAccountIndex = index;
    const newAccount = privateKeyToAccount(privateKey);

    console.log(`\n✅ Wallet doğrulandı!`);
    console.log(`✅ Değiştirildi: ${newAccount.address.slice(0, 10)}...`);

    if (intelligenceAddress && faithAddress) {
        const intBalance = await publicClient.readContract({
            address: intelligenceAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [newAccount.address]
        });

        const fthBalance = await publicClient.readContract({
            address: faithAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [newAccount.address]
        });

        const intLevel = Math.floor(Number(formatEther(intBalance)) / 100);
        const fthLevel = Math.floor(Number(formatEther(fthBalance)) / 100);
        const level = intLevel + fthLevel;
        const rank = getRank(level);
        const classType = getClass(intLevel, fthLevel);

        console.log(`${rank.emoji} ${rank.name} (Level ${level})`);
        console.log(`${classType.emoji} Hoşgeldin, ${classType.name}!\n`);
    }
}

async function showMyLevel() {
    const { publicClient, account } = getClients();

    console.log('\n=== 📊 SEVİYEM ===\n');

    try {
        const intBalance = await publicClient.readContract({
            address: intelligenceAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [account.address]
        });

        const fthBalance = await publicClient.readContract({
            address: faithAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [account.address]
        });

        const intLevel = Math.floor(Number(formatEther(intBalance)) / 100);
        const fthLevel = Math.floor(Number(formatEther(fthBalance)) / 100);
        const totalLevel = intLevel + fthLevel;
        const rank = getRank(totalLevel);
        const classType = getClass(intLevel, fthLevel);

        console.log(`🧠 Intelligence: ${formatEther(intBalance)} INT`);
        console.log(`   INT Level: ${intLevel}\n`);
        console.log(`🙏 Faith: ${formatEther(fthBalance)} FTH`);
        console.log(`   FTH Level: ${fthLevel}\n`);
        console.log(`⚔️  Toplam Level: ${totalLevel}`);
        console.log(`${rank.emoji} Rank: ${rank.name}`);
        console.log(`${classType.emoji} Class: ${classType.name}\n`);
    } catch (error) {
        console.error('❌ Hata:', error.message, '\n');
    }
}

async function showAllTarnished() {
    const { publicClient } = getClients();

    console.log('\n=== 👥 TÜM TARNISHED SEVİYELERİ ===\n');
    console.log(' #  Address          INT   FTH   Level  Rank            Class');
    console.log('─────────────────────────────────────────────────────────────────');

    for (let i = 0; i < ANVIL_ACCOUNTS.length; i++) {
        const acc = privateKeyToAccount(ANVIL_ACCOUNTS[i]);

        try {
            const intBalance = await publicClient.readContract({
                address: intelligenceAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [acc.address]
            });

            const fthBalance = await publicClient.readContract({
                address: faithAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [acc.address]
            });

            const intLevel = Math.floor(Number(formatEther(intBalance)) / 100);
            const fthLevel = Math.floor(Number(formatEther(fthBalance)) / 100);
            const level = intLevel + fthLevel;
            const rank = getRank(level);
            const classType = getClass(intLevel, fthLevel);

            const intStr = Number(formatEther(intBalance)).toFixed(0).padStart(5);
            const fthStr = Number(formatEther(fthBalance)).toFixed(0).padStart(5);
            const levelStr = level.toString().padStart(5);
            console.log(` ${i}  ${acc.address.slice(0, 10)}...  ${intStr} ${fthStr}  ${levelStr}  ${rank.emoji} ${rank.name.padEnd(8)}  ${classType.emoji} ${classType.name}`);
        } catch (error) {
            console.log(` ${i}  ${acc.address.slice(0, 10)}...  Error loading`);
        }
    }

    console.log('─────────────────────────────────────────────────────────────────\n');
}

async function showPoolInfo() {
    const { publicClient } = getClients();

    console.log('\n=== 💧 HAVUZ BİLGİLERİ ===\n');

    try {
        const reserves = await publicClient.readContract({
            address: soulsDexAddress,
            abi: SOULS_DEX_ABI,
            functionName: 'getReserves'
        });

        const reserveInt = reserves[0];
        const reserveFth = reserves[1];

        console.log('📊 Havuz Rezervleri:');
        console.log(`  🧠 Intelligence: ${formatEther(reserveInt)} INT`);
        console.log(`  🙏 Faith: ${formatEther(reserveFth)} FTH\n`);

        // Calculate price ratios
        if (reserveInt > 0n && reserveFth > 0n) {
            const intToFth = Number(formatEther(reserveFth)) / Number(formatEther(reserveInt));
            const fthToInt = Number(formatEther(reserveInt)) / Number(formatEther(reserveFth));

            console.log('💱 Fiyat Oranları:');
            console.log(`  1 INT = ${intToFth.toFixed(4)} FTH`);
            console.log(`  1 FTH = ${fthToInt.toFixed(4)} INT\n`);
        } else {
            console.log('⚠️  Havuzda henüz likidite yok!\n');
        }
    } catch (error) {
        console.error('❌ Hata:', error.message, '\n');
    }
}

async function showAscensionStats() {
    const { publicClient, account } = getClients();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              📈 YÜKSELİŞ İSTATİSTİKLERİ 📈               ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    try {
        // Load stats
        const statsPath = path.join(__dirname, '../stats.json');

        if (!fs.existsSync(statsPath)) {
            console.log('❌ İstatistik dosyası bulunamadı!\n');
            return;
        }

        const statsData = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        const playerStats = statsData[account.address];

        if (!playerStats) {
            console.log('❌ Bu wallet için istatistik bulunamadı!\n');
            return;
        }

        // Calculate playtime
        const playTime = Date.now() - playerStats.startTime;
        const minutes = Math.floor(playTime / 60000);
        const seconds = Math.floor((playTime % 60000) / 1000);

        console.log(`⏱️  Oyun Süresi: ${minutes} dakika ${seconds} saniye\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Get current balances
        const intBalance = await publicClient.readContract({
            address: intelligenceAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [account.address]
        });

        const fthBalance = await publicClient.readContract({
            address: faithAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [account.address]
        });

        const currentINT = Number(formatEther(intBalance));
        const currentFTH = Number(formatEther(fthBalance));
        const initialINT = Number(playerStats.initialINT);
        const initialFTH = Number(playerStats.initialFTH);

        // INT stats
        const intChange = currentINT - initialINT;
        const intPercent = ((intChange / initialINT) * 100).toFixed(1);
        const intTrend = intChange > 0 ? '⬆️ Artan' : intChange < 0 ? '⬇️ Azalan' : '➡️ Sabit';

        console.log('🧠 INTELLIGENCE');
        console.log(`   Başlangıç: ${initialINT} INT`);
        console.log(`   Şu An:     ${currentINT.toFixed(2)} INT`);
        console.log(`   Değişim:   ${intChange > 0 ? '+' : ''}${intChange.toFixed(2)} INT (${intPercent > 0 ? '+' : ''}${intPercent}%)`);
        console.log(`   Gelişim:   ${intTrend}\n`);

        // FTH stats
        const fthChange = currentFTH - initialFTH;
        const fthPercent = ((fthChange / initialFTH) * 100).toFixed(1);
        const fthTrend = fthChange > 0 ? '⬆️ Artan' : fthChange < 0 ? '⬇️ Azalan' : '➡️ Sabit';

        console.log('🙏 FAITH');
        console.log(`   Başlangıç: ${initialFTH} FTH`);
        console.log(`   Şu An:     ${currentFTH.toFixed(2)} FTH`);
        console.log(`   Değişim:   ${fthChange > 0 ? '+' : ''}${fthChange.toFixed(2)} FTH (${fthPercent > 0 ? '+' : ''}${fthPercent}%)`);
        console.log(`   Gelişim:   ${fthTrend}\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Total stats
        const initialTotal = initialINT + initialFTH;
        const currentTotal = currentINT + currentFTH;
        const totalChange = currentTotal - initialTotal;
        const totalPercent = ((totalChange / initialTotal) * 100).toFixed(1);

        const initialLevel = Math.floor(initialTotal / 100);
        const currentLevel = Math.floor(currentTotal / 100);
        const initialRank = getRank(initialLevel);
        const currentRank = getRank(currentLevel);

        const intLevel = Math.floor(currentINT / 100);
        const fthLevel = Math.floor(currentFTH / 100);
        const classType = getClass(intLevel, fthLevel);

        console.log('⚡ TOPLAM YÜKSELİŞ');
        console.log(`   Başlangıç Toplam: ${initialTotal} token`);
        console.log(`   Şu Anki Toplam:   ${currentTotal.toFixed(2)} token`);
        console.log(`   Net Gelişim:      ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(2)} token (${totalPercent > 0 ? '+' : ''}${totalPercent}%)\n`);
        console.log(`   Seviye: ${initialLevel} → ${currentLevel} ${currentLevel > initialLevel ? '(Yükseldi!)' : currentLevel < initialLevel ? '(Düştü)' : '(Değişmedi)'}`);
        console.log(`   Rank:   ${currentRank.emoji} ${currentRank.name}`);
        console.log(`   Class:  ${classType.emoji} ${classType.name}\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Dynamic message
        if (intLevel > fthLevel) {
            console.log('💡 Büyücü yolunda ilerliyorsun! Intelligence artıyor.\n');
        } else if (fthLevel > intLevel) {
            console.log('💡 Rahip yolunda ilerliyorsun! Faith artıyor.\n');
        } else {
            console.log('💡 Dengeli bir yoldasın! Her iki gücü de eşit kullanıyorsun.\n');
        }

    } catch (error) {
        console.error('❌ Hata:', error.message, '\n');
    }
}

async function showSecurityInfo() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║           🛡️  GÜVENLİK SİSTEMLERİ 🛡️                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('📊 Souls DEX Güvenlik Durumu:\n');

    // 1. Reentrancy Guard
    console.log('✅ 1. Reentrancy Guard');
    console.log('   Aynı fonksiyonun tekrar tekrar çağrılmasını önler.');
    console.log('   Hacker\'ın havuzu boşaltma saldırısından korur.\n');



    // 2. Private Key Authentication
    console.log('✅ 2. Private Key Authentication');
    console.log('   Wallet değiştirmek için private key gerekir.');
    console.log('   Sadece doğru key ile geçiş yapılabilir.\n');

    // 3. Proportional Liquidity
    console.log('✅ 3. Proportional Liquidity');
    console.log('   Havuz oranını korur, manipülasyonu önler.');
    console.log('   Sadece doğru oranda likidite eklenir.\n');

    // 4. Owner-Only Minting
    console.log('✅ 4. Owner-Only Minting');
    console.log('   Sadece founder yeni token basabilir.');
    console.log('   Yetkisiz token basımını engeller.\n');



    console.log('─────────────────────────────────────────────────────────\n');
    console.log('🔒 Güvenlik Özellikleri: 4/4 Aktif');
    console.log('⚡ Souls DEX güvenli bir şekilde çalışıyor!\n');
}

// ============================================
// MAIN MENU
// ============================================

async function mainMenu() {
    const { account } = getClients();

    while (true) {
        console.log(`📡 Anvil RPC: ${RPC_URL}`);
        console.log(`⚰️  Current Tarnished: ${account.address.slice(0, 10)}...`);

        if (intelligenceAddress && faithAddress) {
            const { publicClient } = getClients();
            const intBalance = await publicClient.readContract({
                address: intelligenceAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [account.address]
            });

            const fthBalance = await publicClient.readContract({
                address: faithAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [account.address]
            });

            const level = calculateLevel(intBalance, fthBalance);
            const rank = getRank(level);

            const intLevel = Math.floor(Number(formatEther(intBalance)) / 100);
            const fthLevel = Math.floor(Number(formatEther(fthBalance)) / 100);
            const classType = getClass(intLevel, fthLevel);

            console.log(`${rank.emoji} Rank: ${rank.name} (Level ${level})`);
            console.log(`${classType.emoji} Class: ${classType.name}`);
        }

        console.log('');

        const answer = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: 'Ne yapmak istersin?',
            pageSize: 11,
            choices: [
                '⚡ Likidite Ekle',
                '⚔️  Swap (Fedakarlık)',
                '💀 Ruh Transferi',
                '🪙 Token Mint Et (Sadece Founder)',
                '🔄 Wallet Değiştir',
                '📊 Seviyemi Gör',
                '👥 Tüm Tarnished Seviyelerini Görüntüle',
                '💧 Havuz Bilgilerini Gör',
                '📈 Yükseliş İstatistikleri',
                '🛡️  Güvenlik Sistemleri',
                '🔥 Çıkış'
            ]
        }]);

        console.log('');

        switch (answer.action) {
            case '⚡ Likidite Ekle':
                await addLiquidity();
                break;
            case '⚔️  Swap (Fedakarlık)':
                await swap();
                break;
            case '💀 Ruh Transferi':
                await transfer();
                break;
            case '🪙 Token Mint Et (Sadece Founder)':
                await mintTokens();
                break;
            case '🔄 Wallet Değiştir':
                await switchWallet();
                break;
            case '📊 Seviyemi Gör':
                await showMyLevel();
                break;
            case '👥 Tüm Tarnished Seviyelerini Görüntüle':
                await showAllTarnished();
                break;
            case '💧 Havuz Bilgilerini Gör':
                await showPoolInfo();
                break;
            case '📈 Yükseliş İstatistikleri':
                await showAscensionStats();
                break;
            case '🛡️  Güvenlik Sistemleri':
                await showSecurityInfo();
                break;
            case '🔥 Çıkış':
                console.log('👋 Görüşmek üzere, Tarnished...\n');
                process.exit(0);
        }

        await inquirer.prompt([{
            type: 'input',
            name: 'continue',
            message: 'Devam etmek için Enter\'a bas...'
        }]);
    }
}

// ============================================
// MAIN ENTRY POINT
// ============================================

async function main() {
    showBanner();

    if (!intelligenceAddress || !faithAddress || !soulsDexAddress) {
        await deploymentFlow();

        // Reload env
        dotenv.config({ override: true });
        intelligenceAddress = process.env.INTELLIGENCE_ADDRESS;
        faithAddress = process.env.FAITH_ADDRESS;
        soulsDexAddress = process.env.SOULS_DEX_ADDRESS;
    }

    await mainMenu();
}

main().catch(console.error);
