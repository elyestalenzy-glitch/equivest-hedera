import { Client, PrivateKey, TopicCreateTransaction } from "@hashgraph/sdk";
import * as dotenv from "dotenv";

// 1. Load environment variables. Assuming this script is run from the 'backend'
// directory, dotenv.config() will find the backend/.env file automatically.
dotenv.config();

async function createNewHCSTopic() {
    // 2. Get keys from the process environment
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const hederaNetwork = process.env.HEDERA_NETWORK?.toLowerCase();

    if (!operatorId || !operatorKey || !hederaNetwork) {
        throw new Error("❌ Environment Error: Missing HEDERA_OPERATOR_ID, HEDERA_OPERATOR_KEY, or HEDERA_NETWORK in .env file.");
    }

    // 3. Initialize Client
    let client;
    if (hederaNetwork === "mainnet") {
        client = Client.forMainnet();
    } else if (hederaNetwork === "testnet") {
        client = Client.forTestnet();
    } else {
        throw new Error(`❌ Invalid HEDERA_NETWORK value: ${hederaNetwork}. Must be 'testnet' or 'mainnet'.`);
    }

    client.setOperator(operatorId, PrivateKey.fromString(operatorKey));

    console.log("Starting TopicCreateTransaction on Hedera Consensus Service...");

    try {
        // 4. Create the Topic Transaction
        const transaction = await new TopicCreateTransaction()
            .setTopicMemo("Equivest Property Verification Topic")
            .execute(client); // Execute with server operator key

        // 5. Get the Topic ID from the receipt
        const receipt = await transaction.getReceipt(client);
        const newTopicId = receipt.topicId;

        if (!newTopicId) {
            throw new Error("Failed to create HCS Topic. Receipt status was not SUCCESS.");
        }

        console.log(`✅ Success! New HCS Topic ID: ${newTopicId.toString()}`);
        console.log("---------------------------------------------------------");
        console.log("❗️ ACTION REQUIRED: Add this ID to your backend/.env file:");
        console.log(`HCS_TOPIC_ID=${newTopicId.toString()}`);
        console.log("---------------------------------------------------------");
        
        return newTopicId.toString();

    } catch (error) {
        console.error("❌ HCS Topic Creation Failed:", error);
    }
}

createNewHCSTopic();