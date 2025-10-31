// backend/routes/propertiesMirrorRoutes.ts
import { Router, Request, Response } from "express";
import { Client, TokenId, TokenInfoQuery } from "@hashgraph/sdk"; // Hedera SDK

const router = Router();

// Configure your Hedera client (testnet)
const client = Client.forTestnet();
client.setOperator(
  process.env.OPERATOR_ID!,
  process.env.OPERATOR_KEY!
);

// Example list of property tokens (replace with your actual token IDs)
const propertyTokenIds = [
  "0.0.7097833",
  "0.0.7097834",
  "0.0.7097835",
];

// GET /properties/mirror → fetch properties + token info
router.get("/mirror", async (_req: Request, res: Response) => {
  try {
    const propertiesWithTokenInfo = await Promise.all(
      propertyTokenIds.map(async (tokenIdStr) => {
        const tokenId = TokenId.fromString(tokenIdStr);
        try {
          const tokenInfo = await new TokenInfoQuery()
            .setTokenId(tokenId)
            .execute(client);

          // Safe conversion from BigInt to number
          const totalSupply = Number(tokenInfo.totalSupply ?? 0);
          const decimals = tokenInfo.decimals ?? 0;

          // For demo purposes, tokensRemaining = totalSupply (replace with actual treasury / circulating logic)
          const tokensRemaining = totalSupply; 

          return {
            tokenId: tokenId.toString(),
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            totalTokens: totalSupply,
            tokensRemaining,
            decimals,
            // any additional fields you need
          };
        } catch (err: any) {
          console.error(`❌ Failed to fetch token info for ${tokenIdStr}:`, err.message);
          return {
            tokenId: tokenIdStr,
            name: "Unknown",
            symbol: "N/A",
            totalTokens: 0,
            tokensRemaining: 0,
            decimals: 0,
          };
        }
      })
    );

    console.log("✅ Fetched properties with token info:", propertiesWithTokenInfo);
    res.json(propertiesWithTokenInfo);
  } catch (err: any) {
    console.error("❌ Mirror node fetch failed:", err);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
});

export default router;
