#!/usr/bin/env node

const { ethers } = require('ethers');
const { buildMimcSponge } = require('circomlibjs');
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');

// Constants
const TREE_LEVELS = 20;
const ZKEY_PATH = path.join(__dirname, '../circuits/build/Verifier.zkey');
const WASM_PATH = path.join(__dirname, '../circuits/build/Verifier_js/Verifier.wasm');

// Initialize provider from .env file
require('dotenv').config();
const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

let mimc;

// Initialize MiMC
async function initialize() {
  mimc = await buildMimcSponge();
  console.log("MiMC initialized");
}

// Generate a new commitment
async function generateCommitment() {
  // Generate random nullifier and secret
  const nullifier = BigInt('0x' + require('crypto').randomBytes(31).toString('hex'));
  const secret = BigInt('0x' + require('crypto').randomBytes(31).toString('hex'));
  
  // Calculate commitment from nullifier and secret
  const commitment = mimc.F.toString(mimc.multiHash([nullifier.toString(), secret.toString()]));
  
  // Calculate nullifier hash (used for verification)
  const nullifierHash = mimc.F.toString(mimc.multiHash([nullifier.toString()]));
  
  return {
    nullifier: nullifier.toString(),
    secret: secret.toString(),
    commitment: commitment,
    nullifierHash: nullifierHash
  };
}

// Create CLI commands
program
  .name('zkp-cli')
  .description('CLI tool for testing ZKP workflow')
  .version('1.0.0');

program
  .command('generate-commitment')
  .description('Generate a new commitment (nullifier, secret, commitment, nullifierHash)')
  .action(async () => {
    await initialize();
    const commitment = await generateCommitment();
    console.log(commitment);
    console.log("\nStore these values safely, you'll need them to vote!");
  });

program
  .command('generate-proof')
  .description('Generate a ZK proof for voting')
  .requiredOption('-n, --nullifier <nullifier>', 'Nullifier value')
  .requiredOption('-s, --secret <secret>', 'Secret value')
  .requiredOption('-c, --commitment <commitment>', 'Commitment value')
  .requiredOption('-e, --election <id>', 'Election ID')
  .requiredOption('-p, --party <id>', 'Party ID')
  .action(async (options) => {
    await initialize();
    
    // Verify that commitment matches nullifier+secret
    const expectedCommitment = mimc.F.toString(mimc.multiHash([options.nullifier.toString(), options.secret.toString()]));
    if (expectedCommitment !== options.commitment) {
      console.error("Error: The provided commitment doesn't match the nullifier and secret");
      return;
    }
    
    // TODO: In a real implementation, you'd need to get the Merkle path
    // For testing, we'll use dummy values
    const pathElements = Array(TREE_LEVELS).fill(BigInt(1).toString());
    const pathIndices = Array(TREE_LEVELS).fill("0");
    
    // Input for the ZK proof
    const input = {
      nullifier: options.nullifier,
      secret: options.secret,
      pathElements,
      pathIndices
    };
    
    try {
      // Generate the proof
      console.log("Generating ZK proof...");
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        WASM_PATH,
        ZKEY_PATH
      );
      
      console.log("Proof generated!");
      console.log("Public Signals:", publicSignals);
      
      // Convert proof to solidity calldata format
      const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
      
      // Parse calldata
      const argv = calldata
        .replace(/["[\]\s]/g, "")
        .split(",")
        .map((x) => ethers.BigNumber.from(x).toString());
      
      const a = [argv[0], argv[1]];
      const b = [
        [argv[2], argv[3]],
        [argv[4], argv[5]],
      ];
      const c = [argv[6], argv[7]];
      
      const result = {
        electionId: options.election,
        partyId: options.party,
        nullifierHash: publicSignals[0],
        root: publicSignals[1],
        proof_a: a,
        proof_b: b,
        proof_c: c
      };
      
      console.log("\nVote Transaction Data:");
      console.log(JSON.stringify(result, null, 2));
      
      // Save to file
      fs.writeFileSync(
        'vote-transaction-data.json',
        JSON.stringify(result, null, 2)
      );
      console.log("\nData saved to vote-transaction-data.json");
    } catch (error) {
      console.error("Error generating proof:", error);
    }
  });

program
  .command('submit-vote')
  .description('Submit a vote using ZK proof')
  .requiredOption('-f, --file <path>', 'Path to vote transaction data JSON')
  .option('-c, --contract <address>', 'Contract address (optional)')
  .action(async (options) => {
    try {
      // Load vote data
      const voteData = JSON.parse(fs.readFileSync(options.file, 'utf8'));
      
      // Load contract
      const contractAddress = options.contract || process.env.VOTING_CONTRACT_ADDRESS;
      if (!contractAddress) {
        console.error("Error: Contract address not provided");
        return;
      }
      
      const abi = JSON.parse(fs.readFileSync(path.join(__dirname, '../abi/VotingSystem.json'), 'utf8'));
      const contract = new ethers.Contract(contractAddress, abi, wallet);
      
      // Submit vote transaction
      console.log("Submitting vote transaction...");
      const tx = await contract.vote(
        voteData.electionId,
        voteData.partyId,
        voteData.nullifierHash,
        voteData.root,
        voteData.proof_a,
        voteData.proof_b,
        voteData.proof_c
      );
      
      console.log("Transaction submitted:", tx.hash);
      console.log("Waiting for confirmation...");
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block", receipt.blockNumber);
      console.log("Vote successfully recorded!");
    } catch (error) {
      console.error("Error submitting vote:", error);
    }
  });

program.parse();