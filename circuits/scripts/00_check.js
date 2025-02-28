// main.js
import { ethers, BigNumber } from "ethers";
import { buildMimcSponge } from "circomlibjs";
// Import your functions from the file that contains your exported methods.
// Adjust the module path if needed.
import {
  generateCommitment,
  calculateMerkleRootAndPath,
  calculateMerkleRootAndZKProof,
} from "./merkleUtils.js"; 

async function main() {
  // -------------- Adjustable Inputs --------------
  // Merkle tree depth (levels)
  const LEVELS = 20;
  // Ethereum provider URL (e.g., Infura or Alchemy endpoint)
  const providerURL = "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID";
  // Contract address that emits "Commit" events (if applicable)
  const contractAddress = "0xYourContractAddress";
  // Path to your zkey file (or its contents as required by your setup)
  const zkeyInput = "../circuit/inputs/Verifier.json";
  // --------------------------------------------------

  // Setup an Ethereum provider
  const provider = new ethers.providers.JsonRpcProvider(providerURL);

  // Generate a new commitment (this gives you nullifier, secret, commitment, nullifierHash)
  console.log("Generating a new commitment...");
  const commitment = await generateCommitment();
  console.log("Commitment:", commitment);

  // Build the MiMC instance used for hashing
  const mimc = await buildMimcSponge();

  // For demonstration, we create a commitments array.
  // In a real scenario, you might fetch multiple commitments from on-chain events.
  const commitmentsArray = [BigNumber.from(commitment.commitment)];

  // Calculate the Merkle tree root and the path (sibling nodes and indices) for the generated commitment.
  console.log("Calculating Merkle root and path...");
  const merkleData = calculateMerkleRootAndPath(
    mimc,
    LEVELS,
    commitmentsArray,
    commitment.commitment
  );
  console.log("Merkle Root:", merkleData.root);
  console.log("Path Elements:", merkleData.pathElements);
  console.log("Path Indices:", merkleData.pathIndices);

  // Optionally, if you want to generate a zero-knowledge proof:
  try {
    console.log("Calculating Zero-Knowledge Proof...");
    const zkProofData = await calculateMerkleRootAndZKProof(
      contractAddress,
      provider,
      LEVELS,
      commitment,
      zkeyInput
    );
    console.log("Zero-Knowledge Proof Data:", zkProofData);
  } catch (error) {
    console.error("Error calculating ZK proof (perhaps missing a deployed contract or zkey file):", error);
  }
}

main().catch((error) => {
  console.error("Error in main execution:", error);
});
