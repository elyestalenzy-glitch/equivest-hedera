import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

dotenv.config();

// --- ES module __dirname replacement ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load PropertyTokenManager ABI via fs (safe for ts-node/esm) ---
const artifactPath = path.resolve(
  __dirname,
  "../../smart-contracts/artifacts/contracts/PropertyTokenManagerHBAR.sol/PropertyTokenManagerHBAR.json"
);
const PropertyTokenManagerJson = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

export interface ERC20RegisterParams {
  tokenId: string;       // HTS token ID (e.g. "0.0.7147805")
  propertyId: string;    // property identifier (symbolic)
  totalSupply: number;
  price: number;         // price per token in tinybars (number)
  launchTime?: number;   // timestamp in seconds, default = now
}

/**
 * Registers a Hedera HTS token in the ERC20 smart contract.
 * Uses ECDSA key from .env for signing the transaction.
 * NOTE: Supply key update removed (we agreed).
 */
export async function registerERC20(params: ERC20RegisterParams): Promise<string> {
  // env must be NEW_ERC20_CONTRACT_ADDRESS and ECDSA_PRIVATE_KEY
  const contractAddress = process.env.NEW_ERC20_CONTRACT_ADDRESS;
  const rpcUrl = process.env.HEDERA_EVM_RPC;
  const privateKey = process.env.ECDSA_PRIVATE_KEY;

  if (!contractAddress || !rpcUrl || !privateKey) {
    console.error({
      contractAddress: !!contractAddress,
      rpcUrl: !!rpcUrl,
      privateKey: !!privateKey,
    });
    throw new Error("Missing environment variables: NEW_ERC20_CONTRACT_ADDRESS, HEDERA_EVM_RPC or ECDSA_PRIVATE_KEY");
  }

  // Normalize numeric params to JS Number (safe for your sizes)
  const totalSupplyNum = Number(params.totalSupply);
  const priceNum = Number(params.price);
  const launchTime = params.launchTime ?? Math.floor(Date.now() / 1000);

  if (!Number.isFinite(totalSupplyNum) || !Number.isFinite(priceNum)) {
    throw new Error("Invalid numeric values for totalSupply or price");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, PropertyTokenManagerJson.abi, wallet);

  console.log("🔹 registerERC20() — preparing contract call");
  console.log(`   tokenId: ${params.tokenId}`);
  console.log(`   propertyId: ${params.propertyId}`);
  console.log(`   totalSupply: ${totalSupplyNum}`);
  console.log(`   price: ${priceNum}`);
  console.log(`   launchTime: ${launchTime}`);
  console.log(`   contract: ${contractAddress}`);

  // Call registerToken(tokenId, totalSupply, price, launchTime)
  const tx = await contract.registerToken(
    params.tokenId,
    totalSupplyNum,
    priceNum,
    launchTime
  );

  console.log("⏳ registerToken tx sent, waiting for confirmation...");
  const receipt = await tx.wait();

  console.log(`✅ registerToken confirmed — txHash: ${receipt.transactionHash}`);
  return receipt.transactionHash;
}
