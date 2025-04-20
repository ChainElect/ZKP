const { ethers, network } = require("hardhat");
const { buildMimcSponge, mimcSpongecontract } = require("circomlibjs");

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
  console.log("\nDeploying ZKTree Test...");
  const ZKTreeTest = await ethers.getContractFactory("ZKTreeTest");
  const zktree = await ZKTreeTest.deploy(
    TREE_LEVELS,
    mimcspongeAddress,
    verifierAddress
  );
  await zktree.waitForDeployment();
  const zktreeAddress = await zktree.getAddress();
  console.log("ZKTreeTest deployed to:", zktreeAddress);

  // Deploy VotingSystem - IMPORTANT FIX HERE
  console.log("\nDeploying VotingSystem...");
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  // Correct constructor arguments
  const votingSystem = await VotingSystem.deploy(
    verifierAddress,  // Pass verifier address directly
    TREE_LEVELS,      // Pass tree levels
    mimcspongeAddress // Pass MiMC hasher address
  );
  await votingSystem.waitForDeployment();
  const votingSystemAddress = await votingSystem.getAddress();
  console.log("VotingSystem deployed to:", votingSystemAddress);

  // Wait longer for transactions to be confirmed
  console.log("\nWaiting for more block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds

  // Verification
  if (network.name === "sepolia") {
    console.log("\nVerifying contracts on Etherscan...");
    
    try {
      console.log("\nVerifying Verifier...");
      await hre.run("verify:verify", {
        address: verifierAddress,
        constructorArguments: [],
        contract: "contracts/Verifier.sol:Groth16Verifier"
      });
    } catch (error) {
      console.log("Verifier verification error:", error.message);
    }

    try {
      console.log("\nVerifying ZKTreeTest...");
      await hre.run("verify:verify", {
        address: zktreeAddress,
        constructorArguments: [
          TREE_LEVELS,
          mimcspongeAddress,
          verifierAddress
        ],
        contract: "contracts/ZKTreeTest.sol:ZKTreeTest"
      });
    } catch (error) {
      console.log("ZKTreeTest verification error:", error.message);
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
        contract: "contracts/VotingSystem.sol:VotingSystem"
      });
    } catch (error) {
      console.log("VotingSystem verification error:", error.message);
    }
  }

  console.log("\n🎉 Deployment complete!");
  console.log("MiMCSponge:      " + mimcspongeAddress);
  console.log("Verifier:        " + verifierAddress);
  console.log("ZKTreeTest:      " + zktreeAddress);
  console.log("VotingSystem:    " + votingSystemAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });