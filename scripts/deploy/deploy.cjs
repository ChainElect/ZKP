// deploy.js - Deployment script for ZK voting contracts
import { ethers } from "hardhat";
import { buildMimcSponge, mimcSpongecontract } from "circomlibjs";

// Configuration
const TREE_LEVELS = 20;
const SEED = "mimcsponge";
const ROUNDS = 220;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy MiMCSponge
  console.log("\nDeploying MiMCSponge...");
  const mimcSpongeAbi = mimcSpongecontract.abi.filter(
    entry => entry.type !== "constructor"
  );

  const MiMCSponge = new ethers.ContractFactory(
    mimcSpongeAbi,
    mimcSpongecontract.createCode(SEED, ROUNDS),
    deployer
  );

  const mimcsponge = await MiMCSponge.deploy();
  const mimcspongeAddress = await mimcsponge.getAddress();
  await mimcsponge.waitForDeployment();
  console.log("MiMCSponge deployed to:", mimcspongeAddress);

  // Deploy Verifier
  console.log("\nDeploying Groth16Verifier...");
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  const verifierAddress = await verifier.getAddress();
  await verifier.waitForDeployment();
  console.log("Verifier deployed to:", verifierAddress);

  // Deploy ZKTree
  console.log("\nDeploying ZKTree...");
  const ZKTree = await ethers.getContractFactory("ZKTree");
  const zktree = await ZKTree.deploy(
    TREE_LEVELS,
    mimcspongeAddress,
    verifierAddress
  );
  await zktree.waitForDeployment();
  const zktreeAddress = await zktree.getAddress();
  console.log("ZKTree deployed to:", zktreeAddress);

  // Deploy VotingSystem
  console.log("\nDeploying VotingSystem...");
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  const votingSystem = await VotingSystem.deploy(
    verifierAddress,  // Pass the Verifier address
    TREE_LEVELS,      // Pass tree levels directly 
    mimcspongeAddress // Pass the MiMC hasher address
  );
  const votingSystemAddress = await votingSystem.getAddress();
  await votingSystem.waitForDeployment();
  console.log("VotingSystem deployed to:", votingSystemAddress);

  // Log all deployed contract addresses for verification
  console.log("\n----- DEPLOYED CONTRACTS -----");
  console.log("MiMCSponge:", mimcspongeAddress);
  console.log("Verifier:", verifierAddress);
  console.log("ZKTree:", zktreeAddress);
  console.log("VotingSystem:", votingSystemAddress);
  console.log("\nPlease wait 5-10 minutes before running verify.js to ensure contracts are fully propagated to Etherscan");
  console.log("Copy these addresses to verify.js before running the verification script");
  console.log("-----------------------------");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });