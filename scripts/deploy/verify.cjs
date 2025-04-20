// verify.js - Script to verify deployed contracts on Etherscan
const { run } = require("hardhat");

// Configuration - REPLACE THESE WITH YOUR DEPLOYED CONTRACT ADDRESSES
const TREE_LEVELS = 20;
const MIMCSPONGE_ADDRESS = "0x482A052ae8cfb509B5ba934827f08403dcDeb4fd"; // Replace with your deployed MiMCSponge address
const VERIFIER_ADDRESS = "0xb00b53170c9E31beaf981B592b2879A019fB1E6e";   // Replace with your deployed Verifier address
const ZKTREE_ADDRESS = "0x59102D0c7Eb3C3C400B3bFC2E363eF304C1f667E";     // Replace with your deployed ZKTree address
const VOTINGSYSTEM_ADDRESS = "0xa0b1b817f716D81689480a3c5857Ba25F2BF3743"; // Replace with your deployed VotingSystem address

async function main() {
  console.log("Starting contract verification on Etherscan...");
  console.log("This process may take a few minutes for each contract");

  try {
    console.log("\nVerifying Verifier contract...");
    await run("verify:verify", {
      address: VERIFIER_ADDRESS,
      constructorArguments: [],
    });
    console.log("✅ Verifier verification complete");
  } catch (error) {
    console.log("❌ Verifier verification failed:", error.message);
  }

  try {
    console.log("\nVerifying ZKTree contract...");
    await run("verify:verify", {
      address: ZKTREE_ADDRESS,
      constructorArguments: [
        TREE_LEVELS,
        MIMCSPONGE_ADDRESS,
        VERIFIER_ADDRESS
      ],
    });
    console.log("✅ ZKTree verification complete");
  } catch (error) {
    console.log("❌ ZKTree verification failed:", error.message);
  }

  try {
    console.log("\nVerifying VotingSystem contract...");
    await run("verify:verify", {
      address: VOTINGSYSTEM_ADDRESS,
      constructorArguments: [
        VERIFIER_ADDRESS,
        TREE_LEVELS,
        MIMCSPONGE_ADDRESS
      ],
    });
    console.log("✅ VotingSystem verification complete");
  } catch (error) {
    console.log("❌ VotingSystem verification failed:", error.message);
  }

  console.log("\nVerification process completed");
}

// Execute main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

/*
Deploying MiMCSponge...
MiMCSponge deployed to: 0x482A052ae8cfb509B5ba934827f08403dcDeb4fd

Deploying Groth16Verifier...
Verifier deployed to: 0xb00b53170c9E31beaf981B592b2879A019fB1E6e

Deploying ZKTree...
ZKTree deployed to: 0x59102D0c7Eb3C3C400B3bFC2E363eF304C1f667E

Deploying VotingSystem...
VotingSystem deployed to: 0xa0b1b817f716D81689480a3c5857Ba25F2BF3743
*/ 