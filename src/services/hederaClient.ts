// services/hederaClient.ts
import SignClient from "@walletconnect/sign-client";
import UniversalProvider from "@walletconnect/universal-provider";
import { WalletConnectModal } from "@walletconnect/modal";
import { Networkish } from 'ethers';
import type { SignClientTypes, SessionTypes } from '@walletconnect/types';
// Client import is not needed here as we are not using an operator
// import { Client } from "@hashgraph/sdk"; 

// --- Configuration ---
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("❌ Environment Error: VITE_WALLETCONNECT_PROJECT_ID is missing.");
}
const APP_METADATA: SignClientTypes.Metadata = {
    name: "Equivest dApp",
    description: "Equivest Tokenized Real Estate",
    url: window.location.origin,
    icons: ["https://absolute.url/to/icon.png"], // TODO: Replace with your icon
};

// ❗️ FIX: Hardcoded to testnet and EXPORTED for HIP-30 compliance
export const HEDERA_NETWORK = "testnet";

const HEDERA_CHAIN_ID_WC = `hedera:${HEDERA_NETWORK}`; // CAIP-2
const HEDERA_EVM_CHAIN_ID: Networkish = 296; // EVM Testnet

const hederaNamespace = 'hedera';

// --- WalletConnect Instances ---
let signClient: SignClient | undefined = undefined;
let provider: UniversalProvider | undefined = undefined;
let modal: WalletConnectModal | undefined = undefined;
let session: SessionTypes.Struct | undefined = undefined;
export let connectedAccountId: string | null = null;

// --- Initialization State ---
enum InitState { Idle, Initializing, Initialized, Error }
let initState: InitState = InitState.Idle;
let sdkInitPromise: Promise<void> | null = null;
let eventHandlersAttached = false;

/**
 * Initializes WalletConnect SignClient, UniversalProvider, and Modal.
 */
export const initSDK = (): Promise<void> => {
    // Strict singleton guards
    if (initState !== InitState.Idle) {
         if (initState === InitState.Initializing && sdkInitPromise) {
            console.log("initSDK: Already initializing, returning existing promise.");
            return sdkInitPromise;
         }
         if (initState === InitState.Initialized) {
             console.log("initSDK: Already initialized, returning resolved promise.");
            return Promise.resolve();
         }
         if (initState === InitState.Error) {
             console.log("initSDK: Initialization failed previously, rejecting.");
            return Promise.reject("Initialization failed previously.");
         }
    }

    console.log("🚀 Initializing WalletConnect V2 SDK & Modal (Strict Singleton)...");
    initState = InitState.Initializing;
    eventHandlersAttached = false;

    sdkInitPromise = (async () => {
        try {
            
            if (!provider) {
                provider = await UniversalProvider.init({ projectId: WALLETCONNECT_PROJECT_ID, metadata: APP_METADATA });
                console.log("UniversalProvider initialized.");
            } else {
                console.log("UniversalProvider already exists.");
            }
            
            if (provider && !signClient) {
                signClient = provider.client;
                console.log("SignClient instance (from provider) obtained.");
            }

            if (!modal) {
                modal = new WalletConnectModal({ projectId: WALLETCONNECT_PROJECT_ID });
                console.log("WalletConnectModal instance created.");
            } else {
                console.log("WalletConnectModal already exists.");
            }

            // Attach Event Handlers
             if (provider && !eventHandlersAttached) {
                 console.log("Attaching WalletConnect event handlers...");
                 provider.on("display_uri", async (uri: string) => {
                     console.log("📱 Display URI:", uri);
                     if (modal) { 
                         try { await modal.openModal({ uri }); console.log("Modal open requested."); }
                         catch (modalError) { console.error("❌ Error opening modal:", modalError); } 
                     }
                     else { console.error("Modal not init!"); }
                 });
                 provider.on("connect", (sessionInfo: { session: SessionTypes.Struct }) => { console.log("✅ connect event:", sessionInfo); modal?.closeModal(); });
                 provider.on("session_event", (eventData: any) => console.log("🔔 session_event:", eventData));
                 provider.on("session_update", (eventData: any) => {
                      console.log("🔔 session_update:", eventData);
                      if (eventData.params?.namespaces && session) { session = { ...session, namespaces: eventData.params.namespaces }; }
                 });
                 provider.on("session_delete", async (eventData: any) => { console.log("🔔 session_delete:", eventData); modal?.closeModal(); await disconnectWalletInternal(false); });
                 provider.on("disconnect", async () => { console.log("🔔 provider disconnect event."); modal?.closeModal(); await disconnectWalletInternal(false); });
                 
                 eventHandlersAttached = true;
                 console.log("Event handlers attached.");
            }

            console.log("✅ WalletConnect V2 SDK & Modal Initialized Successfully.");
            initState = InitState.Initialized;
            await restoreSessionInternal();

        } catch (error) {
            console.error("❌ Failed to initialize WalletConnect SDK/Modal:", error);
            signClient = undefined; provider = undefined; modal = undefined; session = undefined;
            initState = InitState.Error; sdkInitPromise = null; eventHandlersAttached = false;
            throw error;
        }
    })();

    return sdkInitPromise;
};


/**
 * Connects to a wallet using WalletConnect modal.
 */
export const connectWallet = async (): Promise<{ accountId: string; balance: string | null }> => {
    
    if (initState !== InitState.Initialized || !provider || !modal) {
         console.warn("connectWallet called before SDK was ready.", { initState, provider: !!provider, modal: !!modal });
         throw new Error("WalletConnect SDK/Provider/Modal is not ready.");
    }
    console.log("connectWallet: SDK initialization confirmed.");

    if (session && connectedAccountId) {
        console.log(`Already connected: ${connectedAccountId}`);
        const balance = await getAccountBalance();
        return { accountId: connectedAccountId, balance };
    }

    console.log("🚀 Attempting new WalletConnect connection...");
    try {
        // ❗️ FIX: Requesting 'hedera_signTransaction' as required by HIP-820
        const hederaRequiredMethods = [
            "hedera_signTransaction", 
            "hedera_signMessage"
        ];
        const hederaEvents = ["chainChanged", "accountsChanged"];
        const namespacesToRequest = {
            [hederaNamespace]: { methods: hederaRequiredMethods, chains: [HEDERA_CHAIN_ID_WC], events: hederaEvents },
        };

        console.log("Calling provider.connect(). Modal will open via 'display_uri' event...");

        session = await provider.connect({ namespaces: namespacesToRequest })
            .catch(error => {
                 modal?.closeModal();
                 
                 const errorMessage = error?.message || "";
                 if (errorMessage.includes("User rejected") || error?.code === 5000 || errorMessage.includes("Modal closed")) {
                      console.log("User rejected connection or closed modal.");
                      throw new Error("Connection rejected or modal closed.");
                 }

                 console.error("provider.connect() error:", error);
                 throw error;
            });

        if (!session) { modal?.closeModal(); throw new Error("Wallet connection failed: No session returned."); }
        console.log("✅ Session established:", session);
        modal?.closeModal();

        const accounts = session.namespaces[hederaNamespace]?.accounts;
        if (!accounts || accounts.length === 0) {
            await disconnectWalletInternal();
            throw new Error(`No Hedera accounts in session for chain ${HEDERA_CHAIN_ID_WC}.`);
        }
        
        const accountString = accounts[0];
        const parts = accountString.split(':');
         if (parts.length !== 3 || parts[0] !== 'hedera' || parts[1] !== HEDERA_NETWORK) {
              await disconnectWalletInternal();
              throw new Error(`Unexpected account format: ${accountString}`);
         }
        connectedAccountId = parts[2]; 

        console.log(`✅ Wallet connected: ${connectedAccountId}`);

        console.log("Fetching balance...");
        const balance = await getAccountBalance();
        return { accountId: connectedAccountId, balance };

    } catch (error) {
        console.error("❌ Wallet connection process error:", error);
        modal?.closeModal();
        await disconnectWalletInternal();
        throw error;
    }
};

/**
 * Internal disconnect function.
 */
const disconnectWalletInternal = async (internalCall = true): Promise<void> => {
     if (!session && !connectedAccountId) {
         console.log("disconnectWalletInternal: Already disconnected.");
         return;
     }
     console.log("disconnectWalletInternal called.");
     modal?.closeModal();
     const topic = session?.topic || provider?.session?.topic;

     if (provider && topic && !internalCall) {
        try {
             console.log(`🔌 Attempting disconnect from session: ${topic}`);
             if (provider.session?.topic === topic) { 
                 await provider.disconnect(); 
                 console.log("provider.disconnect() called."); 
             }
             else if (signClient) { 
                 await signClient.disconnect({ topic, reason: { code: 6000, message: "User disconnected." } }); 
                 console.log("signClient.disconnect() fallback."); 
             }
        } catch (error) { 
            console.error("Disconnect error:", error); 
        }
     } else { 
         console.log("No active session/provider to disconnect, or internal call."); 
     }

     session = undefined;
     connectedAccountId = null;
     console.log("✅ Local state cleared.");
};

/**
 * Public disconnect function.
 */
export const disconnectWallet = async (): Promise<void> => {
    await disconnectWalletInternal(false);
};

/**
 * Attempts to restore an existing session from the provider.
 */
const restoreSessionInternal = async (): Promise<void> => {
    if (!provider || initState !== InitState.Initialized) { 
        console.log("restoreSessionInternal: Provider not ready.");
        return; 
    }
    console.log("restoreSessionInternal: Checking provider session...");

    if (provider.session) {
        session = provider.session;
        console.log("🔄 Found provider session:", session);
        const accounts = session.namespaces[hederaNamespace]?.accounts;
         if (!accounts || accounts.length === 0) { 
             console.warn("Session found but no accounts. Disconnecting.");
             await disconnectWalletInternal(); 
             return; 
         }
         const accountString = accounts[0];
         const parts = accountString.split(':');
         if (parts.length !== 3 || parts[0] !== 'hedera' || parts[1] !== HEDERA_NETWORK) { 
             console.warn(`Invalid account format ${accountString}. Disconnecting.`);
             await disconnectWalletInternal(); 
             return; 
         }
         connectedAccountId = parts[2];
        console.log(`✅ Restored session for ${connectedAccountId}`);
    } else {
        console.log("ℹ️ No active session in provider.");
        session = undefined; 
        connectedAccountId = null;
    }
};

/**
 * Public function to check for and restore a session.
 */
 export const restoreSession = async (): Promise<{ accountId: string; balance: string | null } | null> => {
     await initSDK(); 

     if (initState !== InitState.Initialized) { 
         console.error("restoreSession: SDK not initialized.");
         return null; 
     }
     if (!session) { 
         await restoreSessionInternal(); 
     }

     if (connectedAccountId && session) {
         console.log("restoreSession: Success, fetching balance.");
         const balance = await getAccountBalance();
         return { accountId: connectedAccountId, balance };
     } else {
         console.log(`ℹ️ Restore final check failed: Account=${connectedAccountId}, Session=${!!session}`);
         return null;
     }
 };


// --- Read-Only Functions ---

/**
 * Gets the HBAR balance for the connected account using Hedera Mirror Node REST API.
 */
export const getAccountBalance = async (): Promise<string | null> => {
    if (!connectedAccountId) {
        return null;
    }
    try {
        // ❗️ FIX: Hardcoded to testnet mirror node as requested
        const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com`;
        const balanceUrl = `${mirrorNodeUrl}/api/v1/accounts/${connectedAccountId}`;

        const response = await fetch(balanceUrl);
        if (!response.ok) {
            throw new Error(`Mirror Node request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        const tinybars = data?.balance?.balance ?? 0;
        const balanceHbar = (Number(tinybars) / 100_000_000).toFixed(8); 

        const formattedBalance = parseFloat(balanceHbar).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
        return formattedBalance;

    } catch (error) {
        console.error("❌ Error fetching account balance via MirrorNode:", error);
        return null;
    }
};

/**
 * Gets basic account info.
 */
export const getAccountInfo = (): { accountId: string | null; network: string } => {
    // Return HEDERA_NETWORK constant which is now exported
    return { accountId: connectedAccountId, network: HEDERA_NETWORK };
};

// --- Transaction/Signing Functions ---

/**
 * Returns the raw WalletConnect UniversalProvider for direct requests.
 */
export const getWalletConnectProvider = (): UniversalProvider => {
     if (initState !== InitState.Initialized || !provider) {
         throw new Error(`WalletConnect provider not available. InitState: ${InitState[initState]}. Ensure wallet is connected.`);
     }
     return provider;
 };

 /**
  * Returns the current session.
  */
 export const getSession = (): SessionTypes.Struct | undefined => { return session; };
 /** Helper exports for direct access to low-level WalletConnect objects */
export const getProvider = (): UniversalProvider | undefined => provider;
export const getTopic = (): string | undefined => session?.topic;