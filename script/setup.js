import { execSync } from 'child_process';
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { anvil } from 'viem/chains';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Anvil varsayılan RPC URL
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

// Anvil'in varsayılan 10 hesabının private key'leri ve adresleri
const ANVIL_ACCOUNTS = [
    { 
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    {
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
    },
    {
        address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
    },
    {
        address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6'
    },
    {
        address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        privateKey: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a'
    },
    {
        address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
        privateKey: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba'
    },
    {
        address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
        privateKey: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e'
    },
    {
        address: '0x14dC79964da2C08b23698b3D3cc7Ca32193d9955',
        privateKey: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356'
    },
    {
        address: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8',
        privateKey: '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97'
    },
    {
        address: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
        privateKey: '0x2a871d0798f97d79848a013d4936a73bf4cc922c82533fc4c06f9d2e9d3a1c1e'
    }
];

// İlk hesap (deploy için kullanılacak)
const DEPLOYER_ACCOUNT = ANVIL_ACCOUNTS[0];

// Viem client'ları
const account = privateKeyToAccount(DEPLOYER_ACCOUNT.privateKey);
const publicClient = createPublicClient({
    chain: anvil,
    transport: http(RPC_URL)
});

const walletClient = createWalletClient({
    account,
    chain: anvil,
    transport: http(RPC_URL)
});

// ERC20 ABI (mintTo için)
const ERC20_ABI = [
    {
        "constant": false,
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "mintTo",
        "outputs": [],
        "type": "function"
    }
];

// Kontrat adreslerini parse et (forge create çıktısından)
function parseContractAddress(output) {
    const lines = output.split('\n');
    for (const line of lines) {
        if (line.includes('Deployed to:')) {
            const match = line.match(/0x[a-fA-F0-9]{40}/);
            if (match) {
                return match[0];
            }
        }
    }
    return null;
}

// .env dosyasını güncelle
function updateEnvFile(addresses) {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    
    // Mevcut .env dosyasını oku (varsa)
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
    }
    
    // Yeni değerleri ekle/güncelle
    const envLines = envContent.split('\n').filter(line => line.trim() !== '');
    const envMap = new Map();
    
    // Mevcut değerleri parse et
    envLines.forEach(line => {
        if (line.includes('=') && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            envMap.set(key.trim(), valueParts.join('=').trim());
        }
    });
    
    // Yeni değerleri ekle/güncelle
    envMap.set('PRIVATE_KEY', DEPLOYER_ACCOUNT.privateKey);
    envMap.set('RPC_URL', RPC_URL);
    envMap.set('TOKEN_A_ADDRESS', addresses.intelligence); // app.js ile uyumlu isim
    envMap.set('TOKEN_B_ADDRESS', addresses.faith);        // app.js ile uyumlu isim
    envMap.set('DEX_ADDRESS', addresses.dex);
    
    // .env dosyasını yaz
    const newEnvContent = Array.from(envMap.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log(`✅ .env dosyası güncellendi: ${envPath}`);
}

async function main() {
    console.log('🚀 Souls DEX Kurulum Başlatılıyor...\n');
    
    try {
        // 1. Intelligence Token deploy
        console.log('📦 Intelligence (INT) token deploy ediliyor...');
        // DÜZELTME: --broadcast eklendi!
        const intelligenceOutput = execSync(
            `forge create src/MockToken.sol:MockToken --rpc-url ${RPC_URL} --private-key ${DEPLOYER_ACCOUNT.privateKey} --broadcast --constructor-args "Intelligence" "INT" 1000`,
            { encoding: 'utf-8', cwd: path