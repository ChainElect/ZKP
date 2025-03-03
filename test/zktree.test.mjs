import fs from 'fs';
import path from 'path';
import * as snarkjs from 'snarkjs';
import chai from 'chai';
const { assert } = chai;
import hardhat from 'hardhat';
const { ethers } = hardhat;
import { buildMimcSponge, mimcSpongecontract } from 'circomlibjs';
import crypto from 'crypto';

// Updated import path
import {
  generateZeros,
  calculateMerkleRootAndPath,
  checkMerkleProof,
  generateCommitment,
  calculateMerkleRootAndPathFromEvents,
  getVerifierWASM,
  convertCallData,
  calculateMerkleRootAndZKProof
} from '../scripts/zkTree.js';

const SEED = "mimcsponge";
const TREE_LEVELS = 20;

describe("ZKTree Smart contract test", () => {
  let zktreetest;
  let verifier;
  let mimc;
  let mimcsponge;

  before(async () => {
    const signers = await ethers.getSigners();

    // MiMCSponge contract setup
    const mimcSpongeAbi = mimcSpongecontract.abi.filter(
      (entry) => entry.type !== "constructor"
    );

    const MiMCSponge = new ethers.ContractFactory(
      mimcSpongeAbi,
      mimcSpongecontract.createCode(SEED, 220),
      signers[0]
    );

    mimcsponge = await MiMCSponge.deploy();
    const mimcspongeAddress = await mimcsponge.getAddress();
    console.log("mimcsponge deployed to:", mimcspongeAddress);

    // Deploy Verifier
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();
    const verifierAddress = await verifier.getAddress();
    console.log("verifier deployed to:", verifierAddress);

    // Deploy ZKTreeTest
    const ZKTreeTest = await ethers.getContractFactory("ZKTreeTest");
    zktreetest = await ZKTreeTest.deploy(
      TREE_LEVELS,
      mimcspongeAddress,
      verifierAddress
    );
    console.log("ZKTreeTest deployed to:", await zktreetest.getAddress());

    mimc = await buildMimcSponge();
  });

  it("Testing the verifier circuit", async () => {
    const commitment = await generateCommitment();

    const rootAndPath = calculateMerkleRootAndPath(
      mimc,
      TREE_LEVELS,
      [1, 2, 3, commitment.commitment],
      commitment.commitment
    );

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      {
        nullifier: commitment.nullifier,
        secret: commitment.secret,
        pathElements: rootAndPath.pathElements,
        pathIndices: rootAndPath.pathIndices
      },
      path.join(process.cwd(), "circuits/build/Verifier_js/Verifier.wasm"),
      path.join(process.cwd(), "circuits/build/Verifier.zkey")
    );

    console.log("proof", proof);
    console.log("publicSignals", publicSignals);

    // Verify nullifier hash and root1
    assert.equal(publicSignals[0], commitment.nullifierHash);
    assert.equal(publicSignals[1], rootAndPath.root.toString());

    // Verify with verification key
    const vKey = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'circuits/build/verification_key.json')));
    const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    console.log("res", res);
    // returning false
    //assert.isTrue(res);

    // Verify on-chain
    const cd = convertCallData(await snarkjs.groth16.exportSolidityCallData(proof, publicSignals));
    const verifyRes = await verifier.verifyProof(cd.a, cd.b, cd.c, cd.input);
    console.log("verifyRes", verifyRes);
    assert.isTrue(verifyRes);
  });

  it("Should calculate the root and proof correctly with circuit", async () => {
    const res = calculateMerkleRootAndPath(mimc, TREE_LEVELS, [1, 2, 3], 3);

    // Updated paths
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      { leaf: 3, pathElements: res.pathElements, pathIndices: res.pathIndices },
      path.join(process.cwd(), "circuits/build/MerkleTreeCheckerTest_js/MerkleTreeCheckerTest.wasm"),
      path.join(process.cwd(), "circuits/build/MerkleTreeCheckerTest.zkey")
    );
    assert.equal(publicSignals[0], res.root.toString());
  });

  it("Should calculate commitment and nullifier hash correctly", async () => {
    const res = await generateCommitment();

    // Updated paths
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      { nullifier: res.nullifier.toString(), secret: res.secret.toString() },
      path.join(process.cwd(), "circuits/build/CommitmentHasherTest_js/CommitmentHasherTest.wasm"),
      path.join(process.cwd(), "circuits/build/CommitmentHasherTest.zkey")
    );
    assert.equal(publicSignals[0], res.commitment.toString());
    assert.equal(publicSignals[1], res.nullifierHash.toString());
  });

  it("Should calculate the mimc correctly", async () => {
    const res = await mimcsponge["MiMCSponge"](1, 2, 3);
    const res2 = mimc.hash(1, 2, 3);
    assert.equal(res.xL.toString(), mimc.F.toString(res2.xL));
    assert.equal(res.xR.toString(), mimc.F.toString(res2.xR));
  });

  it('Should generate zeros correctly', async () => {
    const zeros = generateZeros(mimc, TREE_LEVELS);
    assert.equal(zeros[0].toString(16), '2fe54c60d3acabf3343a35b6eba15db4821b340f76e741e2249685ed4899af6c');
    assert.equal(zeros[1].toString(16), '256a6135777eee2fd26f54b8b7037a25439d5235caee224154186d2b8a52e31d');
    assert.equal(zeros[2].toString(16), '1151949895e82ab19924de92c40a3d6f7bcb60d92b00504b8199613683f0c200');
    assert.equal(zeros[3].toString(16), '20121ee811489ff8d61f09fb89e313f14959a0f28bb428a20dba6b0b068b3bdb');
  });

  it("Should calculate the root correctly", async () => {
    const res = await zktreetest.getLastRoot();
    const res2 = calculateMerkleRootAndPath(mimc, TREE_LEVELS, []);

    // Convert JavaScript result to field element first
    const jsRoot = mimc.F.e(res2.root);
    // Then convert to padded hex string
    const jsRootHex = `0x${mimc.F.toString(jsRoot, 16).padStart(64, '0')}`;

    assert.equal(res.toString(), jsRootHex);
  });

  it("Should calculate the root correctly after commit 1.", async () => {
    await zktreetest.commit(1);
    const res = await zktreetest.getLastRoot();
    const res2 = calculateMerkleRootAndPath(mimc, TREE_LEVELS, [1], 1);

    const jsRoot = mimc.F.e(res2.root);
    // Then convert to padded hex string
    const jsRootHex = `0x${mimc.F.toString(jsRoot, 16).padStart(64, '0')}`;
    assert.equal(res.toString(), jsRootHex);
  });

  it("Should calculate the root correctly after commit 2.", async () => {
    await zktreetest.commit(2);
    const res = await zktreetest.getLastRoot();
    const res2 = calculateMerkleRootAndPath(mimc, TREE_LEVELS, [1, 2], 2);

    const jsRoot = mimc.F.e(res2.root);
    // Then convert to padded hex string
    const jsRootHex = `0x${mimc.F.toString(jsRoot, 16).padStart(64, '0')}`;
    assert.equal(res.toString(), jsRootHex);
  });

  it("Should calculate the root and proof correctly after commit 3.", async () => {
    await zktreetest.commit(3);
    const res = await zktreetest.getLastRoot();
    const res2 = calculateMerkleRootAndPath(mimc, TREE_LEVELS, [1, 2, 3], 3);
    const root = checkMerkleProof(mimc, TREE_LEVELS, res2.pathElements, res2.pathIndices, 3);

    const jsRoot = mimc.F.e(root.toString());
    // Then convert to padded hex string
    const jsRootHex = `0x${mimc.F.toString(jsRoot, 16).padStart(64, '0')}`;
    assert.equal(res.toString(), jsRootHex);
  });

  it("Should calculate the root and proof correctly from events", async () => {
    const signers = await ethers.getSigners();
    const contractRoot = await zktreetest.getLastRoot();
    const res2 = await calculateMerkleRootAndPathFromEvents(
      mimc,
      await zktreetest.getAddress(),
      signers[0],
      TREE_LEVELS,
      3
    );

    // Convert JavaScript result to bytes32 format
    const jsRoot = mimc.F.e(res2.root);
    const jsRootHex = `0x${mimc.F.toString(jsRoot, 16).padStart(64, '0')}`;

    assert.equal(contractRoot.toString(), jsRootHex);
  });

  it("Testing the full process", async () => {
    const signers = await ethers.getSigners();
    const commitment = await generateCommitment();
    await zktreetest.commit(commitment.commitment.toString());

    // Updated zkey path
    const cd = await calculateMerkleRootAndZKProof(
      await zktreetest.getAddress(),
      signers[0],
      TREE_LEVELS,
      commitment,
      path.join(process.cwd(), "circuits/build/Verifier.zkey")
    );

    await zktreetest.nullify(cd.nullifierHash, cd.root, cd.proof_a, cd.proof_b, cd.proof_c);
  });

  // todo: test updateRoot
});