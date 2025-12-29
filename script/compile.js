import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 Compiling contracts...\n');

// Create out_solc directory
const outDir = path.join(__dirname, '../out_solc');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Compile function
function compileContract(contractPath, contractName) {
    const source = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            [contractPath]: { content: source }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            }
        }
    };

    // Import callback for OpenZeppelin
    function findImports(importPath) {
        try {
            const nodePath = path.join(__dirname, '../node_modules', importPath);
            return { contents: fs.readFileSync(nodePath, 'utf8') };
        } catch (e) {
            return { error: 'File not found' };
        }
    }

    const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

    if (output.errors) {
        output.errors.forEach(err => {
            if (err.severity === 'error') {
                console.error('❌ Compilation error:', err.formattedMessage);
                process.exit(1);
            }
        });
    }

    const contract = output.contracts[contractPath][contractName];
    return {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    };
}

// Compile MockToken
console.log('📝 Compiling MockToken.sol...');
const mockToken = compileContract(
    path.join(__dirname, '../src/MockToken.sol'),
    'MockToken'
);

fs.writeFileSync(
    path.join(outDir, 'src_MockToken_sol_MockToken.abi'),
    JSON.stringify(mockToken.abi, null, 2)
);
fs.writeFileSync(
    path.join(outDir, 'src_MockToken_sol_MockToken.bin'),
    mockToken.bytecode
);
console.log('✅ MockToken compiled\n');

// Compile SoulsDEX
console.log('📝 Compiling SoulsDEX.sol...');
const soulsDEX = compileContract(
    path.join(__dirname, '../src/SoulsDEX.sol'),
    'SoulsDEX'
);

fs.writeFileSync(
    path.join(outDir, 'src_SoulsDEX_sol_SoulsDEX.abi'),
    JSON.stringify(soulsDEX.abi, null, 2)
);
fs.writeFileSync(
    path.join(outDir, 'src_SoulsDEX_sol_SoulsDEX.bin'),
    soulsDEX.bytecode
);
console.log('✅ SoulsDEX compiled\n');

console.log('🎉 All contracts compiled successfully!');
