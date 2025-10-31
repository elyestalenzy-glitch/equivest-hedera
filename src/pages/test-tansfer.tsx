// src/pages/TestTransferPage.tsx
//
// ARCHITECTURE TEST: Manual Freezing to ensure ALL required fields are set 
// before submitting via WalletConnect provider.request.

import { useState } from "react";
// --- Hedera SDK Imports ---
import {
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountId,
    ContractId,
    Hbar, // ❗️ Needed for fee setting
    TransactionId
} from "@hashgraph/sdk";
// Ethers needed only for utilities
import { ethers, JsonRpcProvider } from "ethers";
import { useWallet } from "@/context/WalletContext";
// ❗️ IMPORTS THE PROVIDER
import { getWalletConnectProvider } from "@/services/hederaClient"; 

// --- Constants ---
const BUY_AMOUNT = 1;
const PRICE_PER_TOKEN_USDC = 1;
const NODE_ACCOUNT_ID = AccountId.fromString("0.0.3"); // Manual Node ID
const MAX_FEE = new Hbar(2); // Set a reasonable Max Fee

// --- Contract Addresses & IDs (Unchanged) ---
const PROPERTY_TOKEN_MANAGER_ID = "0.0.7154510";
const PROPERTY_TOKEN_MANAGER_EVM_ADDRESS = "0xdf4C2228bA3a72DFA77625E315e7a530D17a1CC2";
const MERIDIAN_ERC20_ADDRESS = "0x5f0bd4c091d2572646A265f1E0Ea4C8B85A79fA3";
const MERIDIAN_HTS_ID = "0.0.7154512";
const TEST_USDC_ID = "0.0.7102390";
const TEST_USDC_ADDRESS = "0x84aCA273e329aE1777c0ECd32ee20Cd9D579480b";

// --- Gas Constants (Unchanged) ---
const BUY_TOKENS_GAS = 2_000_000;
const APPROVE_GAS = 500_000;

// --- Ethers ABIs (Unchanged) ---
const ERC20_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
];
const MANAGER_ABI = [
    "function getBuyerBalance(address buyer, string tokenId) view returns (uint256)",
];

// --- Helper Function for Base64 Encoding (Unchanged) ---
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}


export default function TestTransferPage() {
    const { accountId, isConnected } = useWallet();
    const [status, setStatus] = useState("Ready. Ensure wallet is connected.");
    const [isProcessing, setIsProcessing] = useState(false);

    const getProvider = () => {
         if (!isConnected || !accountId) throw new Error("Wallet not connected.");
         return getWalletConnectProvider();
    }

    // Robust error formatting (Unchanged)
    const formatError = (err: any): string => {
        let message = "An unknown error occurred.";
        if (err instanceof Error) { message = err.message || message; }
        else if (typeof err === 'object' && err !== null && typeof err.message === 'string') { message = err.message; }
        let code: number | string | undefined = undefined;
        let dataMessage: string | undefined = undefined;
        let dataStatus: string | undefined = undefined;
        if (typeof err === 'object' && err !== null) {
             code = (err as any).code;
             if (typeof err.data === 'object' && err.data !== null) {
                  dataMessage = typeof (err.data as any).message === 'string' ? (err.data as any).message : undefined;
                  dataStatus = typeof (err.data as any).status === 'string' ? (err.data as any).status : undefined;
             } else if (typeof err.data === 'string') { dataMessage = err.data; }
        }
        if (dataStatus) { message = `Transaction failed with status: ${dataStatus}`; }
        else if (dataMessage) { message = dataMessage; }
        else if (code !== undefined) { message = `Error Code: ${code}. ${message}`; }
        const lowerCaseMessage = message?.toLowerCase() ?? '';
        if (lowerCaseMessage.includes("token_already_associated")) return "Token already associated.";
        if (lowerCaseMessage.includes("nodeaccountid must be set")) return "Network context missing for transaction freeze.";
        if (lowerCaseMessage.includes("transactionid must be set")) return "Transaction ID missing for transaction freeze.";
        if (code === 9000) message = `Wallet Interaction Error (${code}). Check Wallet. ${message}`;
        return (typeof message === 'string' && message.length > 150) ? message.substring(0, 147) + "..." : message;
    };

    // --- Button Handlers using Hedera SDK + provider.request ---

    const handleApprove = async () => {
        if (!accountId) { setStatus("❌ Wallet not connected."); return; }
        setIsProcessing(true);
        setStatus("Starting APPROVE transaction...");
        try {
            const wcProvider = getProvider();
            const buyerAccountId = AccountId.fromString(accountId);
            const approveAmount = BigInt(PRICE_PER_TOKEN_USDC) * BigInt(10) ** BigInt(6);

            // 1. Build and configure the Hedera SDK transaction
            const tx = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(TEST_USDC_ID))
                .setGas(APPROVE_GAS)
                .setFunction("approve", new ContractFunctionParameters()
                    .addAddress(PROPERTY_TOKEN_MANAGER_EVM_ADDRESS)
                    .addUint256(Number(approveAmount))
                );
            
            // 2. ❗️ MANUALLY ASSIGN ALL REQUIRED FIELDS (The Test Pattern)
            const transactionIdApprove = TransactionId.generate(buyerAccountId);
            tx.setTransactionId(transactionIdApprove); // Mandatory payer field
            tx.setNodeAccountIds([NODE_ACCOUNT_ID]); // Mandatory node field
            tx.setMaxTransactionFee(MAX_FEE); // Mandatory max fee field
            console.log(`Manual Freeze Test: TxId set to ${transactionIdApprove.toString()}`);
            
            // 3. Freeze (now context-less, but all fields are provided)
            const frozenTx = tx.freeze(); 
            
            // 4. Serialize and encode
            const txBytes = frozenTx.toBytes();
            const txBase64 = uint8ArrayToBase64(txBytes);

            // 5. Correct WalletConnect params format
            const requestParams = [txBase64];

            setStatus(`1/3: Requesting approval for ${ethers.formatUnits(approveAmount, 6)} USDC via WC...`);
            console.log("Sending hedera_signAndExecuteTransaction for approve (Manual Freeze)...");

            // 6. Send the request
            const result: any = await wcProvider.request({
                method: "hedera_signAndExecuteTransaction",
                params: requestParams, 
            });

            console.log("Approve request result:", result);
            const receipt = result?.receipt;
            const status = receipt?.status?.toUpperCase();
            const success = status === 'SUCCESS' || (result && !result.error && (result.transactionId || result.hash || result === true));

            if (!success) {
                const errorStatus = status || result?.error?.message || (result?.code ? `Code ${result.code}` : 'UNKNOWN_FAILURE');
                throw new Error(`Approve transaction failed. Status: ${errorStatus}. Raw: ${JSON.stringify(result)}`);
            }
            console.log(`Approve Tx Confirmed (Original ID: ${transactionIdApprove.toString()})`);

            setStatus("⏳ 1/3: Approve sent. Verifying allowance after delay...");
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Verify allowance
            const publicRpc = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
            const usdcContract = new ethers.Contract(TEST_USDC_ADDRESS, ERC20_ABI, publicRpc);
            const allowance = await usdcContract.allowance(accountId, PROPERTY_TOKEN_MANAGER_EVM_ADDRESS);
             console.log(`Allowance Check after delay: ${allowance.toString()}`);
             if (allowance < approveAmount) {
                 throw new Error(`Allowance verification failed! Expected >= ${approveAmount}, Got ${allowance}`);
             }

            setStatus(`✅ 1/3: USDC Allowance confirmed: ${ethers.formatUnits(allowance, 6)} USDC. Ready for BUY.`);

        } catch (err: any) {
            console.error("❌ Approve failed:", err);
            setStatus(`❌ Transaction Failed (Approve): ${formatError(err)}`);
        } finally {
            setIsProcessing(false);
        }
    }

    const handleBuy = async () => {
         if (!accountId) { setStatus("❌ Wallet not connected."); return; }
         setIsProcessing(true);
         setStatus("Starting BUY transaction...");
        try {
            const wcProvider = getProvider();
            const buyerAccountId = AccountId.fromString(accountId);
            const transactionIdBuy = TransactionId.generate(buyerAccountId);

            // 1. Build the Hedera SDK transaction
            const tx = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(PROPERTY_TOKEN_MANAGER_ID))
                .setGas(BUY_TOKENS_GAS)
                .setFunction("buyTokens", new ContractFunctionParameters()
                    .addString(MERIDIAN_ERC20_ADDRESS)
                    .addUint256(Number(BUY_AMOUNT))
                );

            // 2. ❗️ MANUALLY ASSIGN ALL REQUIRED FIELDS
            tx.setTransactionId(transactionIdBuy);
            tx.setNodeAccountIds([NODE_ACCOUNT_ID]);
            tx.setMaxTransactionFee(MAX_FEE);
            console.log(`Manual Freeze Test: TxId set to ${transactionIdBuy.toString()}`);

            // 3. Freeze
            const frozenTx = tx.freeze();
            
            // 4. Serialize and encode
            const txBytes = frozenTx.toBytes();
            const txBase64 = uint8ArrayToBase64(txBytes);

            const requestParams = [txBase64];

            console.log("Sending hedera_signAndExecuteTransaction for buyTokens (Manual Freeze)...");

            const result: any = await wcProvider.request({
                method: "hedera_signAndExecuteTransaction",
                params: requestParams,
            });

            console.log("Buy request result:", result);
            const receipt = result?.receipt;
            const status = receipt?.status?.toUpperCase();
            const success = status === 'SUCCESS' || (result && !result.error && (result.transactionId || result.hash || result === true));


            if (!success) {
                const errorStatus = status || result?.error?.message || (result?.code ? `Code ${result.code}` : 'UNKNOWN_FAILURE');
                throw new Error(`Buy transaction failed. Status: ${errorStatus}. Raw: ${JSON.stringify(result)}`);
            }
             console.log(`Buy Tx Confirmed (Original ID: ${transactionIdBuy.toString()})`);

            setStatus("⏳ 2/3: Buy transaction sent. Verifying balance after delay...");
             await new Promise(resolve => setTimeout(resolve, 10000));

            setStatus("✅ 2/3: Buy transaction successful! Proceed to check balance.");

        } catch (err: any) {
            console.error("❌ Buy failed:", err);
            setStatus(`❌ Transaction Failed (Buy): ${formatError(err)}`);
        } finally {
            setIsProcessing(false);
        }
    }

    // ... (handleCheckBalance remains the same) ...
    const handleCheckBalance = async () => {
         if (!accountId) { setStatus("❌ Wallet not connected."); return; }
        setIsProcessing(true);
        setStatus("Starting CHECK BALANCE query via public RPC...");
        try {
            const publicRpc = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
            console.log(`Checking balance for buyer ${accountId} of token ${MERIDIAN_ERC20_ADDRESS} on manager ${PROPERTY_TOKEN_MANAGER_EVM_ADDRESS}`);

            const managerContract = new ethers.Contract(PROPERTY_TOKEN_MANAGER_EVM_ADDRESS, MANAGER_ABI, publicRpc);

            console.warn("Attempting getBuyerBalance with Hedera Account ID as 'buyer' parameter.");
            const buyerTokenBalance = await managerContract.getBuyerBalance(accountId, MERIDIAN_ERC20_ADDRESS);

            let erc20Balance = BigInt(0);
            try {
                const meridianContract = new ethers.Contract(MERIDIAN_ERC20_ADDRESS, ERC20_ABI, publicRpc);
                erc20Balance = await meridianContract.balanceOf(accountId);
            } catch (erc20Error) { console.warn("Could not fetch ERC20 balance:", erc20Error); }

            console.log(`Manager Balance: ${buyerTokenBalance.toString()}, ERC20 Balance: ${erc20Balance.toString()}`);
            setStatus(`✅ Balance Check: Manager records ${buyerTokenBalance.toString()}. Actual ERC20: ${erc20Balance.toString()}.`);

        } catch (err) {
            console.error("❌ Balance check failed:", err);
             const errorString = formatError(err).toLowerCase();
             if (errorString.includes("invalid address") || errorString.includes("ens") || errorString.includes("invalid argument")) {
                  setStatus(`❌ Query Failed: Contract may require EVM address for buyer.`);
             } else {
                  setStatus(`❌ Query Failed (Balance): ${formatError(err)}`);
             }
        } finally {
            setIsProcessing(false);
        }
    }

    // --- UI Rendering ---
    const getStatusClasses = (status: string): string => {
         if (status.startsWith("✅")) return "bg-green-100 text-green-800 border border-green-200";
         if (status.startsWith("❌")) return "bg-red-100 text-red-800 border border-red-200";
         if (status.startsWith("⏳") || status.startsWith("Starting")) return "bg-yellow-100 text-yellow-800 border border-yellow-200";
         return "bg-blue-100 text-blue-800 border border-blue-200";
    };

    return (
        <div className="p-8 font-sans bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
                🚀 Equivest Token Purchase (WCv2 + Manual Freezing Test)
            </h1>
            <p className="text-gray-600 mb-6">
                Testing the Manual Freezing Pattern to isolate the source of the "Unknown Account" error.
            </p>

             <div className="mb-6 p-4 rounded-lg bg-white shadow border border-gray-200 text-sm">
                Status: {isConnected && accountId ? `Connected as ${accountId}` : "Disconnected"}
                 {!isConnected && <span className="ml-2 text-red-600">(Connect wallet)</span>}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-6">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Purchase Details</h2>
                    <p className="text-xs font-mono text-blue-600 break-all">Mgr: {PROPERTY_TOKEN_MANAGER_EVM_ADDRESS}</p>
                 </div>
                 <ul className="text-sm text-gray-600 space-y-2 font-mono">
                    <li>Token: {MERIDIAN_ERC20_ADDRESS} ({MERIDIAN_HTS_ID})</li>
                    <li>Amount: {BUY_AMOUNT}, Cost: {PRICE_PER_TOKEN_USDC} USDC</li>
                    <li>USDC: {TEST_USDC_ADDRESS} ({TEST_USDC_ID})</li>
                 </ul>
            </div>

             <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-blue-800 mb-2">Sequential Test Steps:</p>
                  <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                      <li>Ensure Wallet Connected & Associated with {MERIDIAN_HTS_ID}.</li>
                      <li>Ensure Wallet has Test USDC & HBAR.</li>
                      <li>Click **1. Approve USDC**. This submits the manually-configured transaction.</li>
                      <li>Wait ~10s for confirmation/allowance check.</li>
                      <li>Click **2. Buy Token**.</li>
                      <li>Click **3. Check Balance**.</li>
                  </ol>
             </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <button
                    onClick={handleApprove}
                    disabled={!isConnected || !accountId || isProcessing}
                    className={`px-6 py-3 font-bold rounded-xl shadow-md transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                        (isConnected && accountId) ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300' : 'bg-gray-400'
                    }`}
                >
                    1. Approve USDC
                </button>
                <button
                    onClick={handleBuy}
                    disabled={!isConnected || !accountId || isProcessing}
                     className={`px-6 py-3 font-bold rounded-xl shadow-md transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                        (isConnected && accountId) ? 'bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300' : 'bg-gray-400'
                    }`}
                >
                    2. Buy Token
                </button>
                <button
                    onClick={handleCheckBalance}
                    disabled={!isConnected || !accountId || isProcessing}
                    className={`px-6 py-3 font-bold rounded-xl shadow-md transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                        (isConnected && accountId) ? 'bg-purple-600 hover:bg-purple-700 focus:ring-4 focus:ring-purple-300' : 'bg-gray-400'
                    }`}
                >
                    3. Check Balance
                </button>
            </div>

            <div className={`mt-6 p-4 rounded-xl ${getStatusClasses(status)} font-mono text-sm shadow break-words`}>
                <strong>Status:</strong> {status}
            </div>

        </div>
    );
}