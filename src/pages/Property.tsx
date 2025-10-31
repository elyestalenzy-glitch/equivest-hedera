// src/pages/Property.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { toast } from "@/hooks/use-toast";

export interface PropertyProps {
  id?: string;
  name?: string;
  address?: string;
  price?: number;
  tokenPrice?: number;
  totalTokens?: number;
  tokensRemaining?: number;
  contractHash?: string;
  expectedReturn?: number;
  location?: { neighborhood: string; city: string };
  features?: string[];
  details?: { type: string; yearBuilt: number; units: number; occupancyRate: number };
  heroImage?: string;
  detailImage?: string; // 👈 added this
}

const defaultProperty: PropertyProps = {
  id: "PROP-001",
  name: "Meridian Heights Residency",
  address: "2847 Oak Street, Downtown District, Metro City",
  price: 2500000,
  tokenPrice: 100,
  totalTokens: 25000,
  tokensRemaining: 12500,
  contractHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
  expectedReturn: 8.5,
  location: { neighborhood: "Downtown District", city: "Metro City" },
  features: [
    "Prime downtown location",
    "24/7 security and concierge",
    "Rooftop amenities and pool",
    "Walking distance to transit",
  ],
  details: { type: "Mixed-use residential", yearBuilt: 2022, units: 48, occupancyRate: 94 },
  heroImage: "/src/assets/hero-meridian.jpg",
  detailImage: "/src/assets/test-meridian.jpg",
};

const Property = (props: PropertyProps) => {
  const propertyData = { ...defaultProperty, ...props };
  const [tokensToBuy, setTokensToBuy] = useState(1);
  const { isConnected, connectWallet, accountId } = useWallet();

  const progressPercentage =
    ((propertyData.totalTokens! - propertyData.tokensRemaining!) / propertyData.totalTokens!) * 100;

  const handleBuyToken = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Hedera wallet first",
      });
      return;
    }

    try {
      toast({
        title: "Purchase Initiated",
        description: `Attempting to purchase ${tokensToBuy} token(s) for $${tokensToBuy * propertyData.tokenPrice}`,
      });
      console.log(`Buying ${tokensToBuy} tokens for account ${accountId}...`);
      // TODO: integrate actual smart contract call
    } catch (err) {
      toast({ title: "Purchase Failed", description: (err as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          {/* 👇 FIXED IMAGE REFERENCE */}
          <img
            src={propertyData.detailImage || propertyData.heroImage}
            alt={propertyData.name}
            className="w-full h-[400px] object-cover"
          />
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-green-500 text-white">
              {propertyData.details?.occupancyRate}% Occupied
            </Badge>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          <h3 className="text-2xl font-semibold mb-3">{propertyData.name}</h3>
          <p className="text-muted-foreground">{propertyData.address}</p>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>🏢 Type: {propertyData.details?.type}</div>
            <div>🏗️ Year Built: {propertyData.details?.yearBuilt}</div>
            <div>💰 Price: ${propertyData.price?.toLocaleString()}</div>
            <div>🎯 Expected Return: {propertyData.expectedReturn}%</div>
          </div>

          <div className="pt-4 border-t">
            <label className="text-sm font-medium mb-2 block">Number of tokens to buy:</label>
            <div className="flex items-center space-x-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTokensToBuy(Math.max(1, tokensToBuy - 1))}
                disabled={tokensToBuy <= 1}
              >
                -
              </Button>
              <span className="px-4 py-2 border rounded-md min-w-[60px] text-center">{tokensToBuy}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setTokensToBuy(Math.min(propertyData.tokensRemaining!, tokensToBuy + 1))
                }
                disabled={tokensToBuy >= propertyData.tokensRemaining!}
              >
                +
              </Button>
            </div>

            {!isConnected ? (
              <Button variant="investment" className="w-full" size="lg" onClick={connectWallet}>
                Connect Wallet
              </Button>
            ) : (
              <Button variant="investment" className="w-full" size="lg" onClick={handleBuyToken}>
                <Users className="mr-2 h-4 w-4" />
                Buy Tokens
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Property;
