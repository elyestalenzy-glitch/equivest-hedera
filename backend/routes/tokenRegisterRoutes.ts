import { Router, Request, Response } from "express";
import { registerERC20, ERC20RegisterParams } from "../services/tokenRegisterService.js";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

// --- ES module __dirname replacement ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load PropertyTokenManager ABI ---
const artifactPath = path.resolve(
  __dirname,
  "../../smart-contracts/artifacts/contracts/PropertyTokenManager.sol/PropertyTokenManager.json"
);
const PropertyTokenManagerJson = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

// --- Helper to create contract instance ---
function getContract() {
  const contractAddress = process.env.ERC20_CONTRACT_ADDRESS;
  const rpcUrl = process.env.HEDERA_EVM_RPC;
  const privateKey = process.env.ECDSA_PRIVATE_KEY;

  if (!contractAddress || !rpcUrl || !privateKey) {
    throw new Error("Missing env: ERC20_CONTRACT_ADDRESS or HEDERA_EVM_RPC or ECDSA_PRIVATE_KEY");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, PropertyTokenManagerJson.abi, wallet);
}

// --- POST / : register token from backend/admin ---
router.post("/", async (req: Request, res: Response) => {
  try {
    // Removed launchTime from destructuring
    const { tokenId, propertyId, totalSupply, price } = req.body;
    
    // Removed launchTime from validation
    if (!tokenId || !propertyId || totalSupply === undefined || price === undefined) {
      return res.status(400).json({ error: "Missing required parameters: tokenId, propertyId, totalSupply, price" });
    }

    const params: ERC20RegisterParams = {
      erc20Address: tokenId, // ERC20 contract address as tokenId
      totalSupply: Number(totalSupply),
      price: Number(price),
      // launchTime removed
    };

    console.log(`🔸 /tokens/register — registering ${tokenId}`);
    const txHash = await registerERC20(params);

    res.json({ success: true, txHash });
  } catch (err: unknown) {
    console.error("❌ /tokens/register error:", err);
    if (err instanceof Error) return res.status(500).json({ error: err.message });
    return res.status(500).json({ error: "Unknown error" });
  }
});

// --- GET /check/:tokenId : check registration on contract ---
router.get("/check/:tokenId", async (req: Request, res: Response) => {
  try {
    const tokenId = req.params.tokenId;
    if (!tokenId) return res.status(400).json({ error: "Missing tokenId" });

    const contract = getContract();
    console.log(`🔎 Checking registration for tokenId ${tokenId}`);
    const tokens: string[] = await contract.getAllTokens();
    const isRegistered = tokens.includes(tokenId);

    res.json({ tokenId, isRegistered, allRegisteredTokens: tokens });
  } catch (err: unknown) {
    console.error("❌ /tokens/register/check error:", err);
    if (err instanceof Error) return res.status(500).json({ error: err.message });
    return res.status(500).json({ error: "Unknown error" });
  }
});

// --- POST /registerFrontend : register token safely from frontend ---
router.post("/registerFrontend", async (req: Request, res: Response) => {
  try {
    // Removed launchTime from destructuring
    const { tokenId, propertyId, totalSupply, price } = req.body;
    
    // Removed launchTime from validation
    if (!tokenId || !propertyId || totalSupply === undefined || price === undefined) {
      return res.status(400).json({ error: "Missing required parameters: tokenId, propertyId, totalSupply, price" });
    }

    const contract = getContract();
    console.log(`🌐 /tokens/register/registerFrontend — checking if ${tokenId} already registered`);
    const tokens: string[] = await contract.getAllTokens();
    const alreadyRegistered = tokens.includes(tokenId);

    const responsePayload: any = {
      tokenId,
      alreadyRegistered,
      allRegisteredTokens: tokens,
      erc20TxHash: null,
    };

    if (!alreadyRegistered) {
      const params: ERC20RegisterParams = {
        erc20Address: tokenId,
        totalSupply: Number(totalSupply),
        price: Number(price),
        // launchTime removed
      };
      const txHash = await registerERC20(params);
      responsePayload.erc20TxHash = txHash;
    } else {
      console.log(`⚠️ Token ${tokenId} already registered`);
    }

    res.json(responsePayload);
  } catch (err: unknown) {
    console.error("❌ /tokens/register/registerFrontend error:", err);
    if (err instanceof Error) return res.status(500).json({ error: err.message });
    return res.status(500).json({ error: "Unknown error" });
  }
});

export default router;
