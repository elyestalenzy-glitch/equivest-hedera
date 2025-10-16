// src/context/WalletContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  initSDK,
  connectWallet as hederaConnectWallet,
  disconnectWallet as hederaDisconnectWallet,
  restoreSession,
  getAccountBalance,
} from "@/services/hederaClient";

interface WalletContextType {
  accountId: string | null;
  balance: string | null;
  isConnected: boolean;
  shortAccount: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const shortAccount = accountId
    ? `${accountId.slice(0, 6)}...${accountId.slice(-4)}`
    : null;

  // Initialize SDK and restore session on mount
  useEffect(() => {
    (async () => {
      await initSDK();
      const restored = await restoreSession();
      if (restored) {
        setAccountId(restored.accountId);
        setBalance(restored.balance);
        setIsConnected(true);
      }
    })();
  }, []);

  // Connect Wallet
  const connectWallet = async () => {
    try {
      const session = await hederaConnectWallet();
      setAccountId(session.accountId);
      setBalance(session.balance);
      setIsConnected(true);
    } catch (err) {
      console.error("❌ connectWallet error:", err);
    }
  };

  // Disconnect Wallet
  const disconnectWallet = async () => {
    await hederaDisconnectWallet();
    setAccountId(null);
    setBalance(null);
    setIsConnected(false);
  };

  // Refresh balance when connected
  useEffect(() => {
    if (!isConnected || !accountId) return;
    (async () => {
      const bal = await getAccountBalance();
      if (bal) setBalance(bal);
    })();
  }, [isConnected, accountId]);

  return (
    <WalletContext.Provider
      value={{
        accountId,
        balance,
        isConnected,
        shortAccount,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within a WalletProvider");
  return context;
};
