import * as dotenv from "dotenv";
import { ethers } from "ethers";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// 1️⃣ ES module __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2️⃣ Load .env explicitly from backend folder
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 3️⃣ Debug print to make sure EVM config is loaded
console.log("HEDERA_EVM_RPC:", process.env.HEDERA_EVM_RPC);
console.log("ERC20_CONTRACT_ADDRESS:", process.env.ERC20_CONTRACT_ADDRESS);
console.log("ECDSA_PRIVATE_KEY loaded:", !!process.env.ECDSA_PRIVATE_KEY);

const rpcUrl = process.env.HEDERA_EVM_RPC;
const contractAddress = process.env.ERC20_CONTRACT_ADDRESS;
const privateKey = process.env.ECDSA_PRIVATE_KEY;

if (!rpcUrl || !contractAddress || !privateKey) {
  console.error("❌ Missing EVM config in .env");
  process.exit(1);
}

// 4️⃣ Load PropertyTokenManager ABI
const artifactPath = path.resolve(
  __dirname,
  "../../smart-contracts/artifacts/contracts/PropertyTokenManager.sol/PropertyTokenManager.json"
);

if (!fs.existsSync(artifactPath)) {
  console.error("❌ Contract artifact not found at:", artifactPath);
  process.exit(1);
}

const artifactJson = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const abi = artifactJson.abi;

// 5️⃣ Connect to provider and wallet
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

// 6️⃣ Connect to new contract
const contract = new ethers.Contract(contractAddress, abi, wallet);

// 7️⃣ Function to check if token is registered
async function isTokenRegistered(tokenId: string, label: string, contractAddr: string) {
  try {
    const tempContract = new ethers.Contract(contractAddr, abi, wallet);
    const allTokens: string[] = await tempContract.getAllTokens();
    const registered = allTokens.includes(tokenId);
    console.log(`\n🔹 ${label} (${contractAddr}) check:`);
    console.log({
      tokenId,
      isRegistered: registered,
      allRegisteredTokens: allTokens,
    });
  } catch (err) {
    console.error(`Error checking token registration for ${label}:`, err);
  }
}

// 8️⃣ Run check for Meridian token
const htsTokenId = "0.0.7097833";

// Check new ERC20 contract
isTokenRegistered(htsTokenId, "New ERC20 contract", contractAddress);

// Check old ERC20 contract
const oldContractAddress = "0xA108c7d9e631386E8aa5229366cAf1231e2AE09d";
isTokenRegistered(htsTokenId, "Old ERC20 contract", oldContractAddress);
