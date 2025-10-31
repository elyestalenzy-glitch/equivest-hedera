import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

dotenv.config();

// --- ES module __dirname replacement ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load PropertyTokenManager ABI ---
const artifactPath = path.resolve(
    __dirname,
    "../../smart-contracts/artifacts/contracts/PropertyTokenManager.sol/PropertyTokenManager.json"
);
const PropertyTokenManagerJson = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

export interface ERC20RegisterParams {
    erc20Address: string; // ERC20 contract address (tokenId in contract)
    totalSupply: number;  // Total property tokens
    price: number;        // Price per token in USDC (6 decimals)
    // launchTime? is removed as the contract no longer accepts it
}

/**
 * Registers an ERC20 token in the PropertyTokenManager contract.
 * Uses the ECDSA key from .env for signing.
 */
export async function registerERC20(params: ERC20RegisterParams): Promise<string> {
    const contractAddress = process.env.ERC20_CONTRACT_ADDRESS // PropertyTokenManager address
    const rpcUrl = process.env.HEDERA_EVM_RPC;
    const privateKey = process.env.ECDSA_PRIVATE_KEY;

    if (!contractAddress || !rpcUrl || !privateKey) {
        throw new Error("Missing required environment variables: ERC20_CONTRACT_ADDRESS or HEDERA_EVM_RPC or ECDSA_PRIVATE_KEY");
    }

    const totalSupplyNum = Number(params.totalSupply);
    const priceNum = Number(params.price);
    // launchTime logic removed

    if (!Number.isFinite(totalSupplyNum) || !Number.isFinite(priceNum)) {
        throw new Error("Invalid numeric values for totalSupply or price");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, PropertyTokenManagerJson.abi, wallet);

    console.log("🔹 registerERC20() — preparing contract call");
    console.log(`   ERC20 address (tokenId): ${params.erc20Address}`);
    console.log(`   totalSupply: ${totalSupplyNum}`);
    console.log(`   price: ${priceNum}`);
    console.log(`   PropertyTokenManager contract: ${contractAddress}`);

    // Call registerToken(erc20Address, totalSupply, price) - ONLY 3 ARGUMENTS NOW!
    const tx = await contract.registerToken(
        params.erc20Address,
        totalSupplyNum,
        priceNum
        // launchTime removed
    );

    console.log("⏳ registerToken tx sent, waiting for confirmation...");
    const receipt = await tx.wait();

    console.log(`✅ registerToken confirmed — txHash: ${receipt.transactionHash}`);
    return receipt.transactionHash;
}
