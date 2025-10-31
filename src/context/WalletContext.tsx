import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import {
  initSDK,
  connectWallet as wcConnectWallet,
  disconnectWallet as wcDisconnectWallet,
  restoreSession,
  getAccountBalance,
  getProvider,
  getTopic,
} from "@/services/hederaClient";

interface WalletContextType {
  accountId: string | null;
  balance: string | null;
  isConnected: boolean;
  isInitializing: boolean;
  shortAccount: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  provider?: any; // 🆕 Added
  topic?: string; // 🆕 Added
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [provider, setProvider] = useState<any>(); // 🆕
  const [topic, setTopic] = useState<string>(); // 🆕

  const initStarted = useRef(false);

  const shortAccount = accountId
    ? `${accountId.slice(0, 6)}...${accountId.slice(-4)}`
    : null;

  const initializeAndRestore = useCallback(async () => {
    console.log("WalletContext: Initializing SDK and restoring session...");
    setIsInitializing(true);
    try {
      await initSDK();
      const restored = await restoreSession();
      if (restored) {
        setAccountId(restored.accountId);
        setBalance(restored.balance);
        setIsConnected(true);
        setProvider(getProvider()); // 🆕
        setTopic(getTopic());       // 🆕
        console.log("WalletContext: Session restored.");
      } else {
        console.log("WalletContext: No session restored.");
        setIsConnected(false);
        setAccountId(null);
        setBalance(null);
      }
    } catch (error) {
      console.error("WalletContext: Error during SDK init/restore:", error);
      setIsConnected(false);
      setAccountId(null);
      setBalance(null);
    } finally {
      setIsInitializing(false);
      console.log("WalletContext: Initialization complete.");
    }
  }, []);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    initializeAndRestore();
  }, [initializeAndRestore]);

  const connectWallet = async () => {
    console.log("WalletContext: Attempting to connect wallet...");
    if (isInitializing) {
      console.warn("WalletContext: connectWallet called while SDK still initializing.");
      return;
    }
    try {
      const session = await wcConnectWallet();
      setAccountId(session.accountId);
      const currentBalance = await getAccountBalance();
      setBalance(currentBalance);
      setIsConnected(true);
      setProvider(getProvider()); // 🆕
      setTopic(getTopic());       // 🆕
      console.log("WalletContext: Wallet connected.");
    } catch (err) {
      console.error("WalletContext: connectWallet error:", err);
      setIsConnected(false);
      setAccountId(null);
      setBalance(null);
    }
  };

  const disconnectWallet = async () => {
    console.log("WalletContext: Disconnecting wallet...");
    await wcDisconnectWallet();
    setAccountId(null);
    setBalance(null);
    setIsConnected(false);
    setProvider(undefined); // 🆕
    setTopic(undefined);    // 🆕
    console.log("WalletContext: Wallet disconnected.");
  };

  useEffect(() => {
    if (!isConnected || !accountId) return;
    getAccountBalance().then(bal => { if (bal) setBalance(bal); });
    const intervalId = setInterval(async () => {
      const bal = await getAccountBalance();
      if (bal) setBalance(bal);
    }, 60000);
    return () => clearInterval(intervalId);
  }, [isConnected, accountId]);

  return (
    <WalletContext.Provider
      value={{
        accountId,
        balance,
        isConnected,
        isInitializing,
        shortAccount,
        connectWallet,
        disconnectWallet,
        provider, // 🆕
        topic,    // 🆕
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
