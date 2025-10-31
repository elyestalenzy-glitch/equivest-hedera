// src/pages/Dashboard.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useWallet } from "@/context/WalletContext"; 
// ❗️ We import the two functions we need from the HIP-820 compliant service
import { signTokenRedemption, executeSwapOnBackend } from "@/services/swapService"; 

// --- CONSTANTS FOR REDEEM ---
const HBAR_USD_RATE = 0.05; // ❗️ Dummy Rate: 1 HBAR = $0.05 USD 
const MERIDIAN_HTS_ID = "0.0.7147805"; // The token the user will send back
const REDEEM_AMOUNT = 1; // Amount of tokens to redeem for testing (1 token)

// Dummy investment data (This is your original dummy data)
const investmentData = {
  propertyTokens: 25, // User holding
  tokenValue: 100, // USD value per token
  totalInvestment: 2500,
  currentValue: 2675,
  gainLoss: 175,
  gainLossPercentage: 7.0,
};

const transactionHistory = [
  {
    id: "TX001",
    type: "buy",
    amount: 10,
    price: 100,
    date: "2024-01-15T10:30:00Z",
    hash: "0x1a2b3c...9f8e7d",
  },
  {
    id: "TX002",
    type: "buy",
    amount: 15,
    price: 100,
    date: "2024-01-10T14:20:00Z",
    hash: "0x9f8e7d...1a2b3c",
  },
];

const Dashboard = () => {
  const [isRedeeming, setIsRedeeming] = useState(false);
  // ✅ This pulls all the live data from your working WalletConnect context
  const { accountId, shortAccount, balance, isConnected } = useWallet(); 

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- HOOKED REDEEM/SELL LOGIC (HIP-820 Compliant) ---
  const handleRedeemTokens = async () => {
    if (!isConnected || !accountId) {
      toast({ title: "Connection Error", description: "Please connect your wallet first.", variant: "destructive" });
      return;
    }

    const tokensToRedeem = REDEEM_AMOUNT;
    // We use the dummy data for now
    if (investmentData.propertyTokens < tokensToRedeem) {
        toast({ title: "Insufficient Tokens", description: `You only hold ${investmentData.propertyTokens} tokens.`, variant: "destructive" });
        return;
    }
    
    // Calculate return value based on dummy data
    const estimatedUSDReturn = tokensToRedeem * investmentData.tokenValue;
    const estimatedHbarReturn = estimatedUSDReturn / HBAR_USD_RATE; 

    console.log(`🔴 Initiating SELL Signature Request (Redeem ${tokensToRedeem} Tokens)`);

    try {
      setIsRedeeming(true);
      
      toast({
        title: "Signing Required (1/2)",
        description: `Please approve sending ${tokensToRedeem} Meridian token(s) to the Treasury.`,
      });
      
      // 1. ❗️ CRITICAL FIX: Call signTokenRedemption with all 4 required arguments
      const submissionResult = await signTokenRedemption(
        tokensToRedeem, 
        accountId, 
        MERIDIAN_HTS_ID,
        estimatedHbarReturn // Pass HBAR return value for backend
      );
      
      // 2. The signTokenRedemption function now handles BOTH signing and submitting to backend
      toast({
        title: "Swap Completed Successfully",
        description: `Backend executed transfer. You received ~${estimatedHbarReturn.toFixed(3)} ℏ.`,
      });

      window.location.reload(); 

    } catch (error) {
      console.error("❌ Redemption Failed:", error);
      toast({
        title: "Redemption Failed",
        description: `Failed to process redemption: ${error instanceof Error ? error.message : 'Unknown Error'}`,
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };
  // -----------------------------------------------------


  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
            Investment Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track your real estate investments and manage your portfolio
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Wallet Info (Pulls live data from useWallet) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                Wallet Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Connected Wallet</p>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={
                      isConnected
                        ? "text-success border-success"
                        : "text-muted border-muted"
                    }
                  >
                    HashPack
                  </Badge>
                  <Badge variant={isConnected ? "secondary" : "destructive"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Wallet Address</p>
                <p className="font-mono text-sm bg-muted px-3 py-2 rounded">
                  {isConnected ? shortAccount || accountId : "Not connected"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">HBAR Balance</p>
                <p className="text-lg font-semibold">
                  {isConnected ? `${balance ?? "0"} ℏ` : "-"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Investment Summary (Uses original dummy data) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Investment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Property Tokens</p>
                  <p className="text-2xl font-bold">
                    {investmentData.propertyTokens}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Token Value</p>
                  <p className="text-2xl font-bold">${investmentData.tokenValue}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Total Investment Value
                </p>
                <p className="text-3xl font-bold text-primary">
                  ${investmentData.currentValue.toLocaleString()}
                </p>
                <div className="flex items-center mt-1">
                  {investmentData.gainLoss > 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-success mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-destructive mr-1" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      investmentData.gainLoss > 0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    ${Math.abs(investmentData.gainLoss)} (
                    {Math.abs(investmentData.gainLossPercentage)}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions (HOOKED) */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">
                    Redeemable Value
                  </h4>
                  <p className="text-2xl font-bold text-primary">
                    {/* Display estimated return in HBAR */}
                    {isConnected ? `~${((investmentData.currentValue / HBAR_USD_RATE)).toFixed(0)} ℏ` : 'Connect Wallet'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Est. return for {REDEEM_AMOUNT} token(s).
                  </p>
                </div>

                <Button
                  variant="destructive"
                  className="w-full"
                  size="lg"
                  onClick={handleRedeemTokens}
                  disabled={isRedeeming || !isConnected || investmentData.propertyTokens < REDEEM_AMOUNT} // Disable if user has < 1 token
                >
                  {isRedeeming ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isRedeeming ? "Processing..." : `Redeem ${REDEEM_AMOUNT} Token(s)`}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Redemption requires you to sign the token transfer.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History (Uses original dummy data) */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactionHistory.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === "buy"
                            ? "bg-success/10"
                            : "bg-destructive/10"
                        }`}
                      >
                        {tx.type === "buy" ? (
                          <ArrowUpRight className="h-5 w-5 text-success" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold capitalize">
                          {tx.type} {tx.amount} Token
                          {tx.amount !== 1 ? "s" : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${(tx.amount * tx.price).toLocaleString()}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <code className="mr-1">{tx.hash}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {transactionHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No transactions yet</p>
                  <p className="text-sm">
                    Your investment activity will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;