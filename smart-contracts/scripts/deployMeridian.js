// scripts/deployMeridian.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  console.log("Deploying MeridianERC20...");

  const name = "MeridianToken";
  const symbol = "MHT";
  const initialSupply = hre.ethers.utils.parseUnits("250000", 18); // 250,000 tokens with 18 decimals

  const Meridian = await hre.ethers.getContractFactory("MeridianERC20");
  const meridian = await Meridian.deploy(name, symbol, initialSupply);

  await meridian.deployed();

  console.log("✅ MeridianERC20 deployed to:", meridian.address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
