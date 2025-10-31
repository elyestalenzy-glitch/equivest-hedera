// scripts/deployTestUSDC.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  console.log("Deploying TestUSDC...");

  const TestUSDC = await hre.ethers.getContractFactory("TestUSDC");
  const usdc = await TestUSDC.deploy();

  await usdc.deployed();

  console.log("✅ TestUSDC deployed to:", usdc.address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
