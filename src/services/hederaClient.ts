// src/services/hederaClient.ts
import { HashinalsWalletConnectSDK } from "@hashgraphonline/hashinal-wc";
import { LedgerId } from "@hashgraph/sdk";

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;
const LEDGER_ENV = import.meta.env.VITE_HEDERA_LEDGER || "testnet";
const LEDGER =
  LEDGER_ENV.toLowerCase() === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET;

const APP_METADATA = {
  name: "Equivest",
  description: "Equivest DApp",
  url: typeof window !== "undefined" ? window.location.origin : "",
  icons: [],
};

let sdk: HashinalsWalletConnectSDK | null = null;
let sdkReady = false;

/**
 * Internal helper: patch the logger for Vite dev mode.
 */
function patchLogger(sdkInstance: HashinalsWalletConnectSDK) {
  try {
    const logger = {
      write: (...args: any[]) => console.log("[Hashinals SDK]", ...args),
      writeLog: (...args: any[]) => console.log("[Hashinals SDK]", ...args),
      info: (...args: any[]) => console.log("[Hashinals SDK INFO]", ...args),
      warn: (...args: any[]) => console.warn("[Hashinals SDK WARN]", ...args),
      error: (...args: any[]) => console.error("[Hashinals SDK ERROR]", ...args),
    };
    (sdkInstance as any).setLogger(logger);
    (sdkInstance as any).setLogLevel("info");
    console.log("🧩 Patched custom logger for Vite dev mode");
  } catch (e) {
    console.warn("⚠️ Failed to patch logger:", e);
  }
}

/**
 * Initializes the Hashinals WalletConnect SDK if not already done.
 */
export async function initSDK(): Promise<HashinalsWalletConnectSDK> {
  if (sdk && sdkReady) return sdk;

  console.log("🟢 Getting Hashinals instance...");
  sdk = HashinalsWalletConnectSDK.getInstance();
  patchLogger(sdk);
  console.log("✅ SDK instance created:", sdk);

  try {
    console.log("🟢 Initializing SDK with:", {
      PROJECT_ID,
      LEDGER: LEDGER.toString(),
      APP_METADATA,
    });
    await sdk.init(PROJECT_ID, APP_METADATA, LEDGER);
    sdkReady = true;
    console.log("✅ SDK initialized successfully");
  } catch (err) {
    console.error("❌ SDK init error:", err);
  }

  return sdk;
}

/**
 * Connect wallet
 */
export async function connectWallet() {
  const sdkInstance = await initSDK();
  try {
    console.log("🔗 Connecting wallet...");
    const session = await sdkInstance.connectWallet(PROJECT_ID, APP_METADATA, LEDGER);
    console.log("✅ Wallet connected:", session);
    return session;
  } catch (err) {
    console.error("❌ Wallet connect failed:", err);
    throw err;
  }
}

/**
 * Disconnect wallet
 */
export async function disconnectWallet() {
  if (!sdk) {
    console.warn("⚠️ No wallet SDK instance to disconnect.");
    return;
  }
  try {
    console.log("🔌 Disconnecting wallet...");
    await sdk.disconnectWallet(true);
    console.log("✅ Wallet disconnected.");
  } catch (err) {
    console.error("❌ Wallet disconnect failed:", err);
  }
}

/**
 * Get account balance
 */
export async function getAccountBalance(): Promise<string | null> {
  const sdkInstance = await initSDK();
  try {
    const balance = await sdkInstance.getAccountBalance();
    console.log("💰 Account balance:", balance);
    return balance;
  } catch (err) {
    console.error("❌ Failed to fetch balance:", err);
    return null;
  }
}

/**
 * Try to restore previous session (if any)
 */
export async function restoreSession() {
  const sdkInstance = await initSDK();
  try {
    const restored = await sdkInstance.initAccount(PROJECT_ID, APP_METADATA, LEDGER);
    if (restored) {
      console.log("✅ Restored session:", restored);
      return restored;
    }
    console.log("ℹ️ No previous session found.");
    return null;
  } catch (err) {
    console.error("❌ Failed to restore session:", err);
    return null;
  }
}
