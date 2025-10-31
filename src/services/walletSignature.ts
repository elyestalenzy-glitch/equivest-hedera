import { Transaction } from "@hashgraph/sdk";
import { 
    getWalletConnectProvider, 
    getAccountInfo, 
    HEDERA_NETWORK
} from "./hederaClient"; 

// --- Helper for Base64 Encoding (Unchanged) ---
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * ❗️ (v2) Executes transaction signing via `hedera_signTransaction`.
 * This v2-compliant function passes the *entire* serialized transaction
 * to the wallet and returns the *entire* signed transaction.
 *
 * @param tx - The *UNFROZEN* Hedera SDK Transaction. This function will freeze it.
 * @returns A base64 string of the *fully signed* transaction from the user.
 */
export async function requestWalletSignatureV2(
    tx: Transaction // Pass in the *unfrozen* tx
): Promise<string> { // ❗️ RETURNS: A single base64 string
    
    const provider = getWalletConnectProvider();
    const accountInfo = getAccountInfo();
    const connectedAccountId = accountInfo.accountId;

    if (!connectedAccountId) {
        throw new Error("Wallet not connected. Cannot request signature.");
    }
    
    // 1. Freeze the transaction (no client needed)
    const frozenTx = tx.freeze();
    
    // 2. ❗️ (v2 FIX) Serialize the *ENTIRE* transaction to bytes
    const txBytes = frozenTx.toBytes();
    if (!txBytes || txBytes.length === 0) {
        throw new Error("Failed to serialize transaction bytes after freezing.");
    }

    // 3. ❗️ (v2 FIX) Base64 encode the *ENTIRE* transaction
    const txBase64 = uint8ArrayToBase64(txBytes);

    console.log(`[v2 Sign-Relay] Requesting signature for TxId: ${tx.transactionId?.toString()}`);
    
    // 4. ❗️ (HIP-30) Format signerAccountId
    const signerAccountId = `hedera:${HEDERA_NETWORK}:${connectedAccountId}`;

    // 5. ❗️ (v2 FIX / HIP-338) Call `hedera_signTransaction` with v2 params
    const result: any = await provider.request({
        method: "hedera_signTransaction",
        params: [
            txBase64,           // Parameter 1: Base64 of *entire* transaction
            signerAccountId     // Parameter 2: signerAccountId
        ], 
    });

    // 6. ❗️ (v2 FIX) Process Result
    // The wallet now returns the base64 of the *signed* transaction
    const signedTxBase64 = Array.isArray(result) ? result[0] : result;
    
    if (!signedTxBase64 || typeof signedTxBase64 !== "string") {
        throw new Error("WalletConnect did not return a valid Base64 signed transaction string.");
    }

    console.log("✅ [v2 Sign-Relay] Signed transaction acquired from wallet.");
    
    // 7. ❗️ (v2 FIX) Return the single base64 string
    return signedTxBase64;
}