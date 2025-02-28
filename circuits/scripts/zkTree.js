import * as crypto from 'crypto';
import * as snarkjs from 'snarkjs';
import { buildMimcSponge } from 'circomlibjs';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ZERO_VALUE = BigInt('21663839004416932945382355908790599225266501822907911457504978515578255421292');

export function getVerifierWASM() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const wasmPath = path.join(__dirname, '../build/Verifier_js/Verifier.wasm');
    return wasmPath;
}

function calculateHash(mimc, left, right) { 
    return BigInt(mimc.F.toString(mimc.multiHash([BigInt(left).toString(), BigInt(right).toString()])));
}

export async function generateCommitment() {
    const mimc = await buildMimcSponge();
    const nullifier = BigInt('0x' + crypto.randomBytes(31).toString('hex'));
    const secret = BigInt('0x' + crypto.randomBytes(31).toString('hex'));
    const commitment = mimc.F.toString(mimc.multiHash([nullifier.toString(), secret.toString()]));
    const nullifierHash = mimc.F.toString(mimc.multiHash([nullifier.toString()]));
    return {
        nullifier: nullifier.toString(),
        secret: secret.toString(),
        commitment: commitment,
        nullifierHash: nullifierHash
    };
}

export function generateZeros(mimc, levels) {
    let zeros = [];
    zeros[0] = ZERO_VALUE;
    for (let i = 1; i <= levels; i++)
        zeros[i] = calculateHash(mimc, zeros[i - 1], zeros[i - 1]);
    return zeros;
}

// calculates Merkle root from elements and a path to the given element 
export function calculateMerkleRootAndPath(mimc, levels, elements, element) {
    const capacity = 2 ** levels;
    if (elements.length > capacity) throw new Error('Tree is full');

    const zeros = generateZeros(mimc, levels);
    let layers = [];
    layers[0] = elements.slice();
    for (let level = 1; level <= levels; level++) {
        layers[level] = [];
        for (let i = 0; i < Math.ceil(layers[level - 1].length / 2); i++) {
            layers[level][i] = calculateHash(
                mimc,
                layers[level - 1][i * 2],
                i * 2 + 1 < layers[level - 1].length ? layers[level - 1][i * 2 + 1] : zeros[level - 1],
            );
        }
    }

    const root = layers[levels].length > 0 ? layers[levels][0] : zeros[levels - 1];

    let pathElements = [];
    let pathIndices = [];

    if (element) {
        const bne = BigInt(element);
        let index = layers[0].findIndex(e => BigInt(e) === bne);
        for (let level = 0; level < levels; level++) {
            pathIndices[level] = index % 2;
            pathElements[level] = (index ^ 1) < layers[level].length ? layers[level][index ^ 1] : zeros[level];
            index >>= 1;
        }
    }

    return {
        root: root.toString(),
        pathElements: pathElements.map((v) => v.toString()),
        pathIndices: pathIndices.map((v) => v.toString())
    };
}

export function checkMerkleProof(mimc, levels, pathElements, pathIndices, element) {
    let hashes = [];
    for (let i = 0; i < levels; i++) {
        const in0 = (i == 0) ? element : hashes[i - 1];
        const in1 = pathElements[i];
        if (pathIndices[i] == 0) {
            hashes[i] = calculateHash(mimc, in0, in1);
        } else {
            hashes[i] = calculateHash(mimc, in1, in0);
        }
    }
    return hashes[levels - 1];
}

export async function calculateMerkleRootAndPathFromEvents(mimc, address, provider, levels, element) {
    const abi = [
        "event Commit(bytes32 indexed commitment,uint32 leafIndex,uint256 timestamp)"
    ];
    const contract = new ethers.Contract(address, abi, provider);
    const events = await contract.queryFilter(contract.filters.Commit());
    let commitments = [];
    for (let event of events) {
        commitments.push(ethers.getBigInt(event.args.commitment));
    }
    return calculateMerkleRootAndPath(mimc, levels, commitments, element);
}

export function convertCallData(calldata) {
    const argv = calldata
        .replace(/["[\]\s]/g, "")
        .split(",")
        .map((x) => ethers.getBigInt(x).toString());

    const a = [argv[0], argv[1]];
    const b = [
        [argv[2], argv[3]],
        [argv[4], argv[5]],
    ];
    const c = [argv[6], argv[7]];
    const input = argv.slice(8);

    return { a, b, c, input };
}

export async function calculateMerkleRootAndZKProof(address, provider, levels, commitment, zkey) {
    const mimc = await buildMimcSponge();
    const rootAndPath = await calculateMerkleRootAndPathFromEvents(mimc, address, provider, levels, commitment.commitment);
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        {
            nullifier: commitment.nullifier, 
            secret: commitment.secret,
            pathElements: rootAndPath.pathElements, 
            pathIndices: rootAndPath.pathIndices
        },
        getVerifierWASM(),
        zkey);
    const cd = convertCallData(await snarkjs.groth16.exportSolidityCallData(proof, publicSignals));
    return {
        nullifierHash: publicSignals[0],
        root: publicSignals[1],
        proof_a: cd.a,
        proof_b: cd.b,
        proof_c: cd.c
    };
}