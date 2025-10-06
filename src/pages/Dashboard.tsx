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
import { useWallet } from "@/context/WalletContext"; // ✅ import wallet hook

// Dummy investment data (kept for now until token is ready)
const investmentData = {
  propertyTokens: 25,
  tokenValue: 100,
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
  const { accountId, shortAccount, balance, isConnected } = useWallet(); // ✅ get wallet info

  const handleRedeemTokens = async () => {
    setIsRedeeming(true);
    try {
      toast({
        title: "Redemption Initiated",
        description: `Redeeming ${investmentData.propertyTokens} tokens worth $${investmentData.currentValue}`,
      });
      console.log("Redeeming tokens...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast({
        title: "Redemption Complete",
        description: "Your tokens have been successfully redeemed!",
      });
    } catch (error) {
      toast({
        title: "Redemption Failed",
        description: "Unable to process redemption. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
          {/* Wallet Info */}
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

          {/* Investment Summary */}
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

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">
                    Available for Redemption
                  </h4>
                  <p className="text-2xl font-bold text-primary">
                    ${investmentData.currentValue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {investmentData.propertyTokens} tokens @ $
                    {investmentData.tokenValue} each
                  </p>
                </div>

                <Button
                  variant="destructive"
                  className="w-full"
                  size="lg"
                  onClick={handleRedeemTokens}
                  disabled={isRedeeming}
                >
                  {isRedeeming ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isRedeeming ? "Processing..." : "Redeem All Tokens"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Token redemption is simulated in this MVP
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
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
