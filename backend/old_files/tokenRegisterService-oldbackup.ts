// backend/services/tokenRegisterService.ts
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

export interface ERC20RegisterParams {
  tokenId: string;       // HTS token ID
  propertyId: string;    // your property identifier
  totalSupply: number;
  price: number;         // price per token in USDC or cents
  launchTime?: number;   // timestamp in seconds, default = now
}

/**
 * Registers a Hedera HTS token in the ERC20 smart contract.
 * Uses ECDSA key from .env for signing the transaction.
 */
export async function registerERC20(params: ERC20RegisterParams): Promise<string> {
  const contractAddress = process.env.ERC20_CONTRACT_ADDRESS;
  const rpcUrl = process.env.HEDERA_EVM_RPC;  // EVM-compatible RPC URL for Hedera testnet
  const privateKey = process.env.ECDSA_PRIVATE_KEY; 

  if (!contractAddress || !rpcUrl || !privateKey) {
    throw new Error("Missing ERC20 contract config or ECDSA key in .env");
  }

  // Connect to Hedera EVM via ethers
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Minimal ABI for registerToken function
  const abi = [
    "function registerToken(string memory tokenId, string memory propertyId, uint256 totalSupply, uint256 price, uint256 launchTime) external returns (bool)"
  ];

  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // Default launchTime = now
  const launchTime = params.launchTime ?? Math.floor(Date.now() / 1000);

  // Call contract
  const tx = await contract.registerToken(
    params.tokenId,
    params.propertyId,
    params.totalSupply,
    params.price,
    launchTime
  );

  const receipt = await tx.wait(); // wait for confirmation
  return receipt.transactionHash;
}
