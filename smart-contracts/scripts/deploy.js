// scripts/deploy.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const testUsdcAddress = "0x84aCA273e329aE1777c0ECd32ee20Cd9D579480b"; // deployed TestUSDC

  console.log("Deploying PropertyTokenManager...");
  const PropertyTokenManager = await hre.ethers.getContractFactory("PropertyTokenManager");
  const manager = await PropertyTokenManager.deploy(testUsdcAddress);

  await manager.deployed();

  console.log("✅ PropertyTokenManager deployed to:", manager.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
