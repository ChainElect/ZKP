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

  // Deploy ZKTreeTest
  console.log("\nDeploying ZKTree...");
  const ZKTreeTest = await ethers.getContractFactory("contracts/ZKTree.sol:ZKTree");
  const zktreetest = await ZKTreeTest.deploy(
    TREE_LEVELS,
    mimcspongeAddress,
    verifierAddress
  );
  await zktreetest.waitForDeployment();
  const zktreeAddress = await zktreetest.getAddress();
  console.log("ZKTreeTest deployed to:", zktreeAddress);

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

    const zkTreeDeployTx = zktreetest.deploymentTransaction();
    await zkTreeDeployTx.wait(6);

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
  }

  console.log("\nDeployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });