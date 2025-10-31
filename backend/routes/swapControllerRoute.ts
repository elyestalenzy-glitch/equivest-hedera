// backend/routes/swapControllerRoute.ts
import {
    Transaction, // ❗️ NOT TransactionBody
    PrivateKey,
    Client
} from "@hashgraph/sdk";
import { Router } from "express";

// ❗️ This is the v2-compliant payload
interface SwapPayloadV2 {
    unsignedTxBase64: string; // The *entire* frozen, unsigned transaction
    // ... you can add other metadata here if needed
    // userAccountId: string;
    // type: "buy" | "sell";
}

/**
 * ❗️ This controller is built for the v2 "Send-and-Sign" pattern.
 * It expects a *single* base64 string of the *entire* unsigned transaction.
 */
export default (client: Client) => {
    const router = Router();

    // ❗️ This route name is arbitrary. Make it match your frontend fetch()
    router.post("/execute-swap-v2", async (req, res) => {
        
        const payload = req.body as SwapPayloadV2;
        console.log(`[SwapController] 1. Received /execute-swap-v2`);

        if (!payload.unsignedTxBase64) {
            console.error("[SwapController] ❌ ERROR: Payload missing unsignedTxBase64.");
            return res.status(400).json({ error: "Invalid transaction payload." });
        }

        try {
            // 1. Deserialize the *entire* transaction from bytes
            //    This one line replaces all 3 of your errors.
            const tx = Transaction.fromBytes(
                Buffer.from(payload.unsignedTxBase64, 'base64')
            );

            // 2. Add the BACKEND'S signature (co-signing)
            const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY!);
            console.log("[SwapController] 2. Co-signing transaction with server key...");
            await tx.sign(operatorKey);

            // 3. Execute the now fully-signed transaction
            console.log("[SwapController] 3. Executing transaction...");
            const txResponse = await tx.execute(client);
            
            const receipt = await txResponse.getReceipt(client);
            const status = receipt.status.toString();

            console.log(`[SwapController] 4. ✅ Swap executed. Status: ${status}`);

            res.json({
                success: true,
                transactionId: txResponse.transactionId.toString(),
                status: status
            });

        } catch (err: any) {
            console.error("[SwapController] ❌ FATAL ERROR processing swap:", err);
            res.status(500).json({ 
                success: false,
                error: "Transaction failed",
                message: err.toString() 
            });
        }
    });

    return router;
};