// backend/routes/verifyHTSRoutes.ts
import { Router, Request, Response } from "express";
import { TopicMessageSubmitTransaction, Client, TopicId } from "@hashgraph/sdk";

// ❗️ Add HCS_TOPIC_ID to your backend/.env file (e.g., 0.0.12345)
const HCS_TOPIC_ID = process.env.HCS_TOPIC_ID;

export default (client: Client) => { // Receives the initialized Hedera client
    const router = Router();

    if (!HCS_TOPIC_ID) {
        console.error("❌ HCS_TOPIC_ID is missing from .env. Verification route disabled.");
        return router;
    }
    
    // Ensure the TopicId is valid before use
    let topicId: TopicId;
    try {
        topicId = TopicId.fromString(HCS_TOPIC_ID);
    } catch (e) {
        console.error("❌ Invalid HCS_TOPIC_ID format in .env:", e);
        return router;
    }
    
    console.log(`✅ HCS verification route initialized for topic ${HCS_TOPIC_ID}`);

    // POST /api/verify
    router.post("/", async (req: Request, res: Response) => {
        const { propertyId, fileHash, tokenId } = req.body;

        if (!propertyId || !fileHash || !tokenId) {
            return res.status(400).json({ error: "Missing required parameters: propertyId, fileHash, or tokenId" });
        }

        // 1. Construct the HCS message payload (JSON string)
        const message = {
            type: "PROPERTY_VERIFICATION",
            propertyId: propertyId,
            tokenId: tokenId,
            documentHash: fileHash,
            timestamp: new Date().toISOString(),
        };

        console.log("Submitting HCS message:", message);

        try {
            // 2. Create and execute the HCS transaction
            const tx = await new TopicMessageSubmitTransaction({
                topicId: topicId, // Use the validated TopicId object
                message: JSON.stringify(message),
            }).execute(client); // Uses the server's operator key to pay/sign

            const receipt = await tx.getReceipt(client);

            // 3. ✅ FIX: Perform null check to satisfy TypeScript
            if (receipt.topicSequenceNumber === null || receipt.topicSequenceNumber === undefined) {
                 throw new Error("Transaction confirmed but failed to receive topic sequence number.");
            }

            console.log(`✅ HCS message submitted! Sequence: ${receipt.topicSequenceNumber.toString()}`);

            res.json({ 
                success: true, 
                transactionId: tx.transactionId.toString(),
                topicSequenceNumber: receipt.topicSequenceNumber.toString(), // Use the checked value
            });

        } catch (err: unknown) {
            console.error("❌ HCS submission failed:", err);
            return res.status(500).json({ error: (err instanceof Error ? err.message : "Unknown HCS error") });
        }
    });

    return router;
};