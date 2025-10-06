// src/context/WalletContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { HashinalsWalletConnectSDK } from "@hashgraphonline/hashinal-wc";
import { LedgerId } from "@hashgraph/sdk";

interface WalletContextType {
  accountId: string | null;
  balance: string | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  shortAccount: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletSDK, setWalletSDK] = useState<HashinalsWalletConnectSDK | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;
  const LEDGER_ENV = import.meta.env.VITE_HEDERA_LEDGER || "testnet";
  const LEDGER =
    LEDGER_ENV.toLowerCase() === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET;

  const shortAccount = accountId
    ? `${accountId.slice(0, 6)}...${accountId.slice(-4)}`
    : null;

  // 🧩 Initialize SDK and try restoring session
  useEffect(() => {
    if (typeof window === "undefined") {
      console.warn("⚠️ Window undefined — skipping SDK init (SSR?)");
      return;
    }

    const APP_METADATA = {
      name: "Equivest",
      description: "Equivest DApp",
      url: window.location.origin,
      icons: [],
    };

    const setupSDK = async () => {
      try {
        console.log("🟢 Getting Hashinals instance...");
        const sdkInstance = HashinalsWalletConnectSDK.getInstance();

        // 🩹 Patch logger for Vite dev mode
        try {
          const logger = {
            write: (...args: any[]) => console.log("[Hashinals SDK]", ...args),
            writeLog: (...args: any[]) => console.log("[Hashinals SDK]", ...args),
            info: (...args: any[]) => console.log("[Hashinals SDK INFO]", ...args),
            error: (...args: any[]) =>
              console.error("[Hashinals SDK ERROR]", ...args),
            warn: (...args: any[]) => console.warn("[Hashinals SDK WARN]", ...args), // <-- fix
          };
          sdkInstance.setLogger(logger as any);
          sdkInstance.setLogLevel("info");
          console.log("🧩 Patched custom logger for Vite dev mode");
        } catch (e) {
          console.warn("⚠️ Failed to patch logger:", e);
        }

        console.log("✅ SDK instance created:", sdkInstance);
        setWalletSDK(sdkInstance);

        console.log("🟢 Initializing SDK with:", {
          PROJECT_ID,
          LEDGER: LEDGER.toString(),
          APP_METADATA,
        });
        await sdkInstance.init(PROJECT_ID, APP_METADATA, LEDGER);
        console.log("✅ SDK initialized successfully");
        setSdkReady(true);

        console.log("🔄 Attempting to restore previous session...");
        const restored = await sdkInstance.initAccount(PROJECT_ID, APP_METADATA, LEDGER);
        if (restored) {
          console.log("✅ Restored session:", restored);
          setAccountId(restored.accountId);
          setBalance(restored.balance);
          setIsConnected(true);
        } else {
          console.log("ℹ️ No previous session found.");
        }
      } catch (err) {
        console.error("❌ SDK init error:", err);
      }
    };

    setupSDK();
  }, []);

  // 🪙 Connect Wallet
  const connectWallet = async () => {
    if (!walletSDK) {
      console.warn("⚠️ Wallet SDK not loaded yet.");
      return;
    }
    if (!sdkReady) {
      console.warn("⚠️ Wallet SDK not ready yet.");
      return;
    }

    const APP_METADATA = {
      name: "Equivest",
      description: "Equivest DApp",
      url: window.location.origin,
      icons: [],
    };

    try {
      console.log("🔗 Connecting wallet...");
      const session = await walletSDK.connectWallet(PROJECT_ID, APP_METADATA, LEDGER);
      console.log("✅ Wallet connected successfully:", session);
      setAccountId(session.accountId);
      setBalance(session.balance);
      setIsConnected(true);
    } catch (err) {
      console.error("❌ Failed to connect wallet:", err);
    }
  };

  // 🔌 Disconnect Wallet
  const disconnectWallet = async () => {
    if (!walletSDK) {
      console.warn("⚠️ No wallet SDK instance to disconnect.");
      return;
    }
    try {
      console.log("🔌 Disconnecting wallet...");
      await walletSDK.disconnectWallet(true);
      setAccountId(null);
      setBalance(null);
      setIsConnected(false);
      console.log("✅ Wallet disconnected.");
    } catch (err) {
      console.error("❌ Failed to disconnect wallet:", err);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        accountId,
        balance,
        isConnected,
        connectWallet,
        disconnectWallet,
        shortAccount,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context)
    throw new Error("useWallet must be used within a WalletProvider");
  return context;
};
