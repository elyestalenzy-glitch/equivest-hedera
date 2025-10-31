// backend/routes/tokenCreateRoutes.ts
import express, { Router, Request, Response } from "express";
import { Client } from "@hashgraph/sdk";
import { createToken, TokenCreateParams } from "../services/tokenCreateService.js";

export default function tokenCreateRoutes(client: Client): Router {
  const router = express.Router();

  router.post("/create", async (req: Request, res: Response) => {
    try {
      const { tokenName, tokenSymbol, decimals, initialSupply } = req.body;

      if (!tokenName || !tokenSymbol || decimals === undefined || initialSupply === undefined) {
        return res.status(400).json({ error: "Missing required token parameters" });
      }

      const params: TokenCreateParams = {
        tokenName,
        tokenSymbol,
        decimals,
        initialSupply,
      };

      const tokenId = await createToken(client, params);

      res.json({ success: true, tokenId });
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) res.status(500).json({ error: err.message });
      else res.status(500).json({ error: "Unknown error" });
    }
  });

  return router;
}
