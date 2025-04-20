const { ethers, network } = require("hardhat");
const { buildMimcSponge, mimcSpongecontract } = require("circomlibjs");

const TREE_LEVELS = 20;
const SEED = "mimcsponge";
const ROUNDS = 220;

// Delay helper
const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy MiMCSponge
  console.log("\nDeploying MiMCSponge...");
  const mimcSpongeAbi = mimcSpongecontract.abi.filter(entry => entry.type !== "constructor");

  const MiMCSponge = new ethers.ContractFactory(
    mimcSpongeAbi,
    mimcSpongecontract.createCode(SEED, ROUNDS),
    deployer
  );

  const mimcsponge = await MiMCSponge.deploy();
  await mimcsponge.waitForDeployment();
  const mimcspongeAddress = await mimcsponge.getAddress();
  console.log("MiMCSponge deployed to:", mimcspongeAddress);

  // Deploy Verifier
  console.log("\nDeploying Groth16Verifier...");
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("Verifier deployed to:", verifierAddress);

  // Deploy ZKTree
  console.log("\nDeploying ZKTree...");
  const ZKTree = await ethers.getContractFactory("contracts/ZKTree.sol:ZKTree");
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
    verifierAddress,
    TREE_LEVELS,
    mimcspongeAddress
  );
  await votingSystem.waitForDeployment();
  const votingSystemAddress = await votingSystem.getAddress();
  console.log("VotingSystem deployed to:", votingSystemAddress);

  // Verification (only on Sepolia)
  if (network.config.chainId === 11155111) {
    console.log("\nPreparing for verification...");
    console.log("Waiting for block confirmations...");

    await mimcsponge.deploymentTransaction().wait(6);
    await verifier.deploymentTransaction().wait(6);
    await zktree.deploymentTransaction().wait(6);
    await votingSystem.deploymentTransaction().wait(6);

    // Wait a bit longer for Etherscan to catch up
    await delay(30000);

    try {
      console.log("\nVerifying Verifier...");
      await hre.run("verify:verify", {
        address: verifierAddress,
        constructorArguments: [],
      });
    } catch (err) {
      console.warn("Verifier verification failed:", err.message);
    }

    try {
      console.log("\nVerifying ZKTree...");
      await hre.run("verify:verify", {
        address: zktreeAddress,
        constructorArguments: [
          TREE_LEVELS,
          mimcspongeAddress,
          verifierAddress
        ],
      });
    } catch (err) {
      console.warn("ZKTree verification failed:", err.message);
    }

    try {
      console.log("\nVerifying VotingSystem...");
      await hre.run("verify:verify", {
        address: votingSystemAddress,
        constructorArguments: [
          verifierAddress,
          TREE_LEVELS,
          mimcspongeAddress
        ],
      });
    } catch (err) {
      console.warn("VotingSystem verification failed:", err.message);
    }
  }

  console.log("\n🎉 Deployment complete!");
  console.log("MiMCSponge:     ", mimcspongeAddress);
  console.log("Verifier:       ", verifierAddress);
  console.log("ZKTree:         ", zktreeAddress);
  console.log("VotingSystem:   ", votingSystemAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("🚨 Deployment failed:", error);
    process.exit(1);
  });
