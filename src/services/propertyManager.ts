// services/hederaClient.ts
import { HashConnect } from "hashconnect";
import {
    /* ... other SDK imports ... */
    Signer 
} from "@hashgraph/sdk";; // <-- Added Signer
import type { DappMetadata } from "hashconnect/dist/types";
import {
    AccountId,
    LedgerId,
    Transaction,
    TransactionReceipt
} from "@hashgraph/sdk";

// --- Configuration ---
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("❌ Environment Error: VITE_WALLETCONNECT_PROJECT_ID is missing.");
}

const APP_METADATA: DappMetadata = {
    name: "Equivest dApp",
    description: "Equivest Tokenized Real Estate",
    url: window.location.origin,
    icons: ["https://absolute.url/to/icon.png"],
};
const HEDERA_NETWORK = import.meta.env.VITE_HEDERA_LEDGER?.toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
const HEDERA_LEDGER_ID = HEDERA_NETWORK === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET;

// --- HashConnect Instances ---
let hashconnect: HashConnect;
let topic: string = "";
let connectedAccountId: string | null = null;
let appSigner: Signer | null = null; // <-- Store the signer

// --- Promise Resolvers for connectWallet() ---
let connectPromiseResolver: ((value: { accountId: string; balance: string | null }) => void) | null = null;
let connectPromiseRejector: ((reason?: any) => void) | null = null;

// --- Initialization State ---
enum InitStateEnum { Idle, Initializing, Initialized, Error }
let initState: InitStateEnum = InitStateEnum.Idle;
let sdkInitPromise: Promise<void> | null = null;

/**
 * Initializes the HashConnect SDK.
 */
export const initSDK = (): Promise<void> => {
    // Strict singleton guards
    if (initState !== InitStateEnum.Idle) {
         if (initState === InitStateEnum.Initializing && sdkInitPromise) return sdkInitPromise;
         if (initState === InitStateEnum.Initialized) return Promise.resolve();
         if (initState === InitStateEnum.Error) return Promise.reject("Initialization failed previously.");
    }

    console.log("🚀 Initializing HashConnect SDK (Strict Singleton)...");
    initState = InitStateEnum.Initializing;

    sdkInitPromise = (async () => {
        try {
            hashconnect = new HashConnect(HEDERA_LEDGER_ID, WALLETCONNECT_PROJECT_ID, APP_METADATA, true);
            setupHashConnectEvents();
            await hashconnect.init();
            console.log("ℹ️ HashConnect init() complete.");
            console.log("✅ HashConnect SDK Initialized Successfully.");
            initState = InitStateEnum.Initialized;
        } catch (error) {
            console.error("❌ Failed to initialize HashConnect SDK:", error);
            initState = InitStateEnum.Error; sdkInitPromise = null;
            throw error;
        }
    })();

    return sdkInitPromise;
};

/**
 * Sets up the event listeners for HashConnect.
 * This is called BEFORE init()
 */
function setupHashConnectEvents() {
    console.log("Attaching HashConnect event listeners...");

    hashconnect.pairingEvent.on(async (pairingData: any) => {
        console.log("🔔 pairingEvent (RAW Payload):", JSON.stringify(pairingData));
        let foundAccount = null;
        let foundTopic = null;

        if (pairingData.accountIds && pairingData.accountIds.length > 0) {
            foundAccount = pairingData.accountIds[0];
            connectedAccountId = foundAccount;
            console.log(`✅ Account ID set from pairingEvent: ${connectedAccountId}`);
            
            // --- Create and store the signer ---
            appSigner = hashconnect.getSigner(AccountId.fromString(connectedAccountId));
            console.log("✅ Signer created and stored.");
            // ------------------------------------

        } else {
             console.error("❌ pairingEvent fired but 'accountIds' was missing or empty.");
        }

        if (pairingData.topic) {
            foundTopic = pairingData.topic;
            topic = foundTopic;
            console.log(`✅ Topic set from pairingEvent: ${topic}`);
        } else {
             console.error("❌ pairingEvent fired but 'topic' was missing.");
        }

        // Check if a connectWallet() promise is waiting to be resolved
        if (foundAccount && foundTopic && connectPromiseResolver) {
            console.log("✅ Both Account and Topic are set. Resolving connectWallet promise...");
            const balance = await getAccountBalance();
            connectPromiseResolver({ accountId: foundAccount, balance });
            connectPromiseResolver = null;
            connectPromiseRejector = null; 
        } else if (connectPromiseResolver) {
            console.error("❌ pairingEvent fired, but 'topic' or 'accountId' is still missing. Rejecting promise.");
            connectPromiseRejector?.(new Error("Pairing failed: Topic or AccountId missing from pairing data."));
            connectPromiseResolver = null;
            connectPromiseRejector = null;
        }
    });

    hashconnect.disconnectionEvent.on((data) => {
        console.log("🔔 disconnectionEvent:", data);
        clearConnectionState();
    });

    hashconnect.connectionStatusChangeEvent.on(async (status) => {
        console.log(`🔔 connectionStatusChangeEvent: ${status}`);
        if (status === "Disconnected") {
            clearConnectionState();
        }
    });
}

/**
 * Clears the local connection state.
 */
function clearConnectionState() {
    console.log("Clearing local connection state...");
    topic = "";
    connectedAccountId = null;
    appSigner = null; // <-- Clear the signer
}

/**
 * Connects to a wallet using HashConnect modal.
 */
export const connectWallet = async (): Promise<{ accountId: string; balance: string | null }> => {
    await initSDK();

    if (initState !== InitStateEnum.Initialized || !hashconnect) {
         throw new Error("HashConnect SDK is not ready.");
    }

    if (connectedAccountId && topic && appSigner) {
        console.log(`Already connected: ${connectedAccountId} with Topic: ${topic}`);
        const balance = await getAccountBalance();
        return { accountId: connectedAccountId, balance };
    }

    console.log("🚀 Attempting new HashConnect pairing...");

    return new Promise(async (resolve, reject) => {
        connectPromiseResolver = resolve;
        connectPromiseRejector = reject;

        try {
            // Pass "light" as a direct string argument
            await hashconnect.openPairingModal("light");
        } catch (error: any) {
            console.error("❌ Error opening pairing modal:", error);
            if (error.message?.includes("Modal closed")) {
                 reject(new Error("Connection cancelled: Modal closed by user."));
            } else {
                 reject(error);
            }
            connectPromiseResolver = null;
            connectPromiseRejector = null;
        }
    });
};

/**
 * Disconnects the wallet.
 */
export const disconnectWallet = async (): Promise<void> => {
    if (initState !== InitStateEnum.Initialized || !hashconnect) return;
    
    console.log(`🔌 Disconnecting...`);
    try {
        await hashconnect.disconnect();
    } catch (error) {
        console.error("❌ Error during disconnect:", error);
    } finally {
        clearConnectionState();
    }
};

/**
 * Restores a session on page load.
 */
export const restoreSession = async (): Promise<{ accountId: string; balance: string | null } | null> => {
    await initSDK(); 

    if (initState !== InitStateEnum.Initialized) {
        console.error("Cannot restore session, SDK not initialized.");
        return null;
    }

    if (connectedAccountId && topic && appSigner) {
        console.log(`✅ restoreSession: Success. Account=${connectedAccountId}, Topic=${topic}`);
        const balance = await getAccountBalance();
        return { accountId: connectedAccountId, balance };
    } else {
        console.log(`ℹ️ restoreSession: No session to restore. Account=${connectedAccountId}, Topic=${topic}`);
        return null;
    }
};

/**
 * Gets the HBAR balance for the connected account.
 */
export const getAccountBalance = async (): Promise<string | null> => {
    if (!connectedAccountId) {
        return null;
    }
    try {
        const mirrorNodeUrl = HEDERA_NETWORK === 'mainnet'
            ? `https://mainnet-public.mirrornode.com`
            : `https://testnet.mirrornode.hedera.com`;
        const balanceUrl = `${mirrorNodeUrl}/api/v1/accounts/${connectedAccountId}`;

        const response = await fetch(balanceUrl);
        if (!response.ok) {
            throw new Error(`Mirror Node request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const tinybars = data?.balance?.balance ?? 0;
        const balanceHbar = (Number(tinybars) / 100_000_000).toFixed(8);
        return parseFloat(balanceHbar).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } catch (error) {
        console.error("❌ Error fetching account balance via Mirror Node:", error);
        return null;
    }
};

export const getAccountInfo = (): { accountId: string | null; network: string } => {
    return { accountId: connectedAccountId, network: HEDERA_NETWORK };
};

// -----------------------------------------------------------------
// NEW FUNCTION: getSigner
// This replaces signAndExecuteTransaction
// -----------------------------------------------------------------
/**
 * Returns the signer object for the connected account.
 */
export const getSigner = (): Signer => {
    if (initState !== InitStateEnum.Initialized || !hashconnect) {
         throw new Error("HashConnect SDK not initialized.");
    }
    if (!appSigner || !connectedAccountId) {
        throw new Error(`HashConnect is not connected. Account or Signer is missing.`);
    }

    console.log(`➡️ Returning signer for account: ${connectedAccountId}`);
    return appSigner;
};