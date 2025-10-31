// backend/routes/tokenRegisterRoutes.ts
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

// --- POST / : register token from backend/admin ---
router.post("/", async (req: Request, res: Response) => {
  try {
    const { tokenId, propertyId, totalSupply, price, launchTime } = req.body;

    if (!tokenId || !propertyId || totalSupply === undefined || price === undefined) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const params: ERC20RegisterParams = { tokenId, propertyId, totalSupply, price, launchTime };
    const txHash = await registerERC20(params);

    res.json({ success: true, txHash });
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error) res.status(500).json({ error: err.message });
    else res.status(500).json({ error: "Unknown error" });
  }
});

// --- GET /check/:tokenId : check registration ---
router.get("/check/:tokenId", async (req: Request, res: Response) => {
  try {
    const tokenId = req.params.tokenId;
    if (!tokenId) return res.status(400).json({ error: "Missing tokenId" });

    const contractAddress = process.env.ERC20_CONTRACT_ADDRESS!;
    const rpcUrl = process.env.HEDERA_EVM_RPC!;
    const privateKey = process.env.ECDSA_PRIVATE_KEY!;

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, PropertyTokenManagerJson.abi, wallet);

    const tokens: string[] = await contract.getAllTokens();
    const isRegistered = tokens.includes(tokenId);

    res.json({ tokenId, isRegistered, allRegisteredTokens: tokens });
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error) res.status(500).json({ error: err.message });
    else res.status(500).json({ error: "Unknown error" });
  }
});

// --- POST /registerFrontend : register token safely from frontend with dual confirmation ---
router.post("/registerFrontend", async (req: Request, res: Response) => {
  try {
    const { tokenId, propertyId, totalSupply, price, launchTime } = req.body;

    if (!tokenId || !propertyId || totalSupply === undefined || price === undefined) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const contractAddress = process.env.ERC20_CONTRACT_ADDRESS!;
    const rpcUrl = process.env.HEDERA_EVM_RPC!;
    const privateKey = process.env.ECDSA_PRIVATE_KEY!;

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, PropertyTokenManagerJson.abi, wallet);

    // 1️⃣ Check if token is already registered
    const tokens: string[] = await contract.getAllTokens();
    const alreadyRegistered = tokens.includes(tokenId);

    // 2️⃣ Prepare response object
    const responsePayload: any = {
      tokenId,
      alreadyRegistered,
      allRegisteredTokens: tokens,
      erc20TxHash: null,
    };

    if (!alreadyRegistered) {
      // Register ERC20 if not yet registered
      const params: ERC20RegisterParams = { tokenId, propertyId, totalSupply, price, launchTime };
      const txHash = await registerERC20(params);
      responsePayload.erc20TxHash = txHash;
    }

    res.json(responsePayload);
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error) res.status(500).json({ error: err.message });
    else res.status(500).json({ error: "Unknown error" });
  }
});

export default router;
