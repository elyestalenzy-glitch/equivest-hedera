// src/services/swapService.ts
import {
    TransferTransaction,
    Hbar,
    TokenId,
    AccountId,
    TransactionId,
    HbarUnit,
} from "@hashgraph/sdk";
// ❗️ (v2 FIX) Import the new v2 signature function
import { requestWalletSignatureV2 } from "./walletSignature"; 
import { getAccountInfo } from "@/services/hederaClient"; 

// --- CONSTANTS ---
const TREASURY_ACCOUNT = "0.0.7091969";
const NODE_ACCOUNT_ID = "0.0.3"; // Hedera Testnet Node 3

/**
 * ❗️ (v2) Signs an HBAR payment and sends the SIGNED tx to the backend.
 */
export async function signHbarPayment(
    hbarAmount: number,
    buyerAccountId: string,
    amountTokens: number // Pass this through for backend metadata
): Promise<any> {
    console.log(`[SwapService v2] 1. signHbarPayment for ${hbarAmount} ℏ`);
    
    const buyerId = AccountId.fromString(buyerAccountId);
    const treasuryId = AccountId.fromString(TREASURY_ACCOUNT);
    
    // 1. Create TransactionId
    const txId = TransactionId.generate(buyerId);

    // 2. Create UNFROZEN transaction
    const tx = new TransferTransaction()
        .addHbarTransfer(buyerId, Hbar.from(hbarAmount, HbarUnit.Hbar).negated())
        .addHbarTransfer(treasuryId, Hbar.from(hbarAmount, HbarUnit.Hbar))
        .setTransactionId(txId)
        .setNodeAccountIds([AccountId.fromString(NODE_ACCOUNT_ID)])
        .setMaxTransactionFee(new Hbar(1, HbarUnit.Hbar));
        // ❗️ DO NOT FREEZE HERE

    // 3. ❗️ (v2 FIX) Call the new v2 signature function
    // This returns a *single* base64 string of the user-signed tx
    const signedTxBase64 = await requestWalletSignatureV2(tx);

    // 4. ❗️ (v2 FIX) Send the v2-compliant payload to the backend
    return executeSwapOnBackend({
        type: "buy",
        txBase64: signedTxBase64, // The new payload field
        txId: txId.toString(),
        userAccountId: buyerAccountId,
        amountTokens: amountTokens,
        amountHbar: hbarAmount,
    });
}

/**
 * ❗️ (v2) Signs a token redemption and sends the SIGNED tx to the backend.
 */
export async function signTokenRedemption(
    tokenAmount: number,
    sellerAccountId: string,
    tokenIdString: string,
    hbarAmountToReturn: number // Pass this through for backend metadata
): Promise<any> {
    console.log(`[SwapService v2] 1. signTokenRedemption for ${tokenAmount} tokens`);

    const sellerId = AccountId.fromString(sellerAccountId);
    const treasuryId = AccountId.fromString(TREASURY_ACCOUNT);
    const tokenId = TokenId.fromString(tokenIdString);

    // 1. Create TransactionId
    const txId = TransactionId.generate(sellerId);

    // 2. Create UNFROZEN transaction
    const tx = new TransferTransaction()
        .addTokenTransfer(tokenId, sellerId, -tokenAmount)
        .addTokenTransfer(tokenId, treasuryId, tokenAmount)
        .setTransactionId(txId)
        .setNodeAccountIds([AccountId.fromString(NODE_ACCOUNT_ID)])
        .setMaxTransactionFee(new Hbar(1, HbarUnit.Hbar));
        // ❗️ DO NOT FREEZE HERE

    // 3. ❗️ (v2 FIX) Call the new v2 signature function
    const signedTxBase64 = await requestWalletSignatureV2(tx);

    // 4. ❗️ (v2 FIX) Send the v2-compliant payload to the backend
    return executeSwapOnBackend({
        type: "sell",
        txBase64: signedTxBase64, // The new payload field
        txId: txId.toString(),
        userAccountId: sellerAccountId,
        amountTokens: tokenAmount,
        amountHbar: hbarAmountToReturn,
    });
}

/**
 * ❗️ (v2) Central API call to the backend
 */
export async function executeSwapOnBackend(payload: {
    type: "buy" | "sell";
    // ❗️ (v2 FIX) Define the new v2 payload
    txBase64: string; // This is the *entire* user-signed transaction
    // Metadata fields are fine
    txId: string;
    userAccountId: string;
    amountTokens: number;
    amountHbar: number;
}): Promise<any> {
    console.log(`[SwapService v2] 2. executeSwapOnBackend (Type: ${payload.type})`);
    
    // ❗️ (v2 FIX) Ensure this route matches your backend (server.ts)
    const response = await fetch("http://localhost:5000/api/swap/execute-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // Send the new v2 payload
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.error || `Backend swap failed with status ${response.status}`);
    }

    console.log("[SwapService v2] 3. Backend execution successful.", result);
    return result}