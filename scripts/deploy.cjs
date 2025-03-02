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
  const ZKTree = await ethers.getContractFactory("contracts/ZKTree.sol:ZKTree");
  const zktree = await ZKTree.deploy(
    TREE_LEVELS,
    mimcspongeAddress,
    verifierAddress
  );
  await zktree.waitForDeployment();
  const zktreeAddress = await zktree.getAddress();
  console.log("ZKTree deployed to:", zktreeAddress);

  console.log("\nDeploying VotingSystem...");
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  const votingSystem = await VotingSystem.deploy(zktreeAddress);
  const votingSystemAddress = await votingSystem.getAddress();
  await votingSystem.waitForDeployment();
  console.log("VotingSystem deployed to:", votingSystemAddress);

  // Verification preparation
  // Verification preparation
  console.log("\nPreparing for verification...");
  if (network.config.chainId === 11155111) { // Sepolia chain ID
    console.log("Waiting for block confirmations...");

    // Wait for 6 blocks after deployment using transaction's wait method
    const mimcSpongeDeployTx = mimcsponge.deploymentTransaction();
    await mimcSpongeDeployTx.wait(6);

    const verifierDeployTx = verifier.deploymentTransaction();
    await verifierDeployTx.wait(6);

    const zkTreeDeployTx = zktree.deploymentTransaction();
    await zkTreeDeployTx.wait(6);

    const votingSystemDeployTx = votingSystem.deploymentTransaction();
    await votingSystemDeployTx.wait(6);

    // Rest of the verification code remains the same
    console.log("\nVerifying Verifier...");
    await hre.run("verify:verify", {
      address: verifierAddress,
      constructorArguments: [],
    });

    console.log("\nVerifying ZKTree...");
    await hre.run("verify:verify", {
      address: zktreeAddress,
      constructorArguments: [
        TREE_LEVELS,
        mimcspongeAddress,
        verifierAddress
      ],
    });

    console.log("\nVerifying VotingSystem...");
    await hre.run("verify:verify", {
      address: votingSystemAddress,
      constructorArguments: [zktreeAddress],
    });
  }

  console.log("\nDeployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });