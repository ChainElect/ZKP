const snarkjs = require('snarkjs');
const { buildPoseidon } = require('circomlibjs');
const PoseidonMerkleTree = require('./merkle.js');
const path = require('path');

// Constants
const TREE_HEIGHT = 20;
const BUILD_DIR = path.join(__dirname, '..', 'build');

const validateCircuitInputs = (input) => {
    const requiredFields = [
        'root', 'proposalId', 'personalId', 
        'secret', 'vote', 'pathElements', 'pathIndices'
    ];
    
    for (const field of requiredFields) {
        if (!input.hasOwnProperty(field)) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    if (input.pathElements.length !== TREE_HEIGHT) {
        throw new Error(`pathElements must have length ${TREE_HEIGHT}, got ${input.pathElements.length}`);
    }
    if (input.pathIndices.length !== TREE_HEIGHT) {
        throw new Error(`pathIndices must have length ${TREE_HEIGHT}, got ${input.pathIndices.length}`);
    }

    const numericFields = ['root', 'proposalId', 'personalId', 'secret', 'vote'];
    for (const field of numericFields) {
        try {
            BigInt(input[field]);
        } catch (e) {
            throw new Error(`${field} must be a valid number: ${e.message}`);
        }
    }

    for (let i = 0; i < input.pathElements.length; i++) {
        try {
            BigInt(input.pathElements[i]);
        } catch (e) {
            throw new Error(`pathElements[${i}] must be a valid number: ${e.message}`);
        }
    }

    for (let i = 0; i < input.pathIndices.length; i++) {
        const index = Number(input.pathIndices[i]);
        if (index !== 0 && index !== 1) {
            throw new Error(`pathIndices[${i}] must be 0 or 1, got ${index}`);
        }
    }
};

async function generateProof() {
    try {
        console.log('[1/6] Initializing Poseidon...');
        const poseidon = await buildPoseidon();

        console.log('[2/6] Initializing Merkle Tree...');
        const tree = new PoseidonMerkleTree(TREE_HEIGHT);
        await tree.initialize();
        console.log('Merkle Tree initialized');

        console.log('[3/6] Generating test parameters...');
        const secret = BigInt("12345").toString();
        const personalId = BigInt("67890").toString();
        const electionId = BigInt("1").toString();
        const vote = BigInt("1").toString();

        console.log('\nInput Parameters:');
        console.log('Secret:', secret);
        console.log('PersonalId:', personalId);
        console.log('ElectionId:', electionId);
        console.log('Vote:', vote);

        console.log('[4/6] Generating commitment...');
        const commitment = poseidon.F.toString(
            poseidon([BigInt(personalId), BigInt(secret)])
        );
        tree.insert(commitment);
        console.log('Commitment inserted:', commitment);

        console.log('[5/6] Generating Merkle proof...');
        const { pathElements, pathIndices, root } = tree.getProof(0);

        console.log('\nMerkle Tree Details:');
        console.log('Tree Height:', tree.getHeight());
        console.log('Merkle Root:', root);

        const input = {
            root: root.toString(),
            proposalId: electionId,
            personalId: personalId,
            secret: secret,
            vote: vote,
            pathElements: pathElements.map(el => el.toString()),
            pathIndices: pathIndices.map(Number)
        };

        validateCircuitInputs(input);

        console.log('\nInput structure validation:');
        console.log(JSON.stringify(input, null, 2));

        console.log('[6/6] Generating zk-SNARK proof...');
        try {
            const wasmPath = path.join(BUILD_DIR, 'voting_js', 'voting.wasm');
            const zkeyPath = path.join(BUILD_DIR, 'voting_final.zkey');
            const vKeyPath = path.join(BUILD_DIR, 'verification_key.json');

            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                wasmPath,
                zkeyPath
            );

            console.log('\nProof Generation Results:');
            console.log('Public Signals:', publicSignals);
            console.log('Proof:', JSON.stringify(proof, null, 2));

            console.log('\nVerifying proof...');
            const vKey = require(vKeyPath);
            const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            console.log('Verification Result:', res);

        } catch (proofErr) {
            console.error('\nProof Generation Error:');
            console.error('Input:', JSON.stringify(input, null, 2));
            console.error('Error:', proofErr);
            throw proofErr;
        }

    } catch (err) {
        console.error('\nDetailed Error:');
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    }
}

generateProof()
    .then(() => {
        console.log('\nProof generation completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nFatal error:', error);
        process.exit(1);
    });