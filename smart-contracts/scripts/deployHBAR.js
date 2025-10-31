require("dotenv").config();
const hre = require("hardhat");

async function main() {
  console.log("Deploying PropertyTokenManagerHBAR...");

  const PropertyTokenManagerHBAR = await hre.ethers.getContractFactory("PropertyTokenManagerHBAR");
  const manager = await PropertyTokenManagerHBAR.deploy(); // no constructor args

  await manager.deployed();

  console.log("✅ PropertyTokenManagerHBAR deployed to:", manager.address);
  console.log("⚠️ Save this address in your .env as NEW_ERC20_CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
