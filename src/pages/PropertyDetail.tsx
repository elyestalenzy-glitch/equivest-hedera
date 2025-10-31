// src/pages/PropertyDetail.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { toast } from "@/hooks/use-toast";
import { getTokenInfo, getAccountTokenBalance } from "@/lib/mirrorNode";
// ❗️ We import the two functions we need from the HIP-820 compliant service
import { signHbarPayment, executeSwapOnBackend } from "@/services/swapService"; 

// Define the full property interface
export interface PropertyProps {
  id: number;
  name: string;
  address: string;
  price: number; // Total value in USD
  tokenPriceUSD: number; // Price per token in USD
  totalTokens: number;
  tokensRemaining: number;
  tokenId?: string;
  contractHash?: string;
  expectedReturn?: number;
  location?: { neighborhood: string; city: string };
  features?: string[];
  details?: { type: string; yearBuilt: number; units: number; occupancyRate: number };
  heroImage?: string;
  detailImage?: string;
  description?: string;
}

// --- CONSTANTS ---
const TREASURY_ACCOUNT = "0.0.7091969";
const HBAR_USD_RATE = 0.05; // ❗️ Dummy Rate: 1 HBAR = $0.05 USD 
const MERIDIAN_HTS_ID = "0.0.7147805"; // ❗️ Native HTS Token ID (Testnet)

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const numericId = Number(id);
  const [property, setProperty] = useState<PropertyProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [amount, setAmount] = useState<number>(1);
  const { accountId, isConnected, connectWallet } = useWallet();

  // --- Data Fetching Logic ---
  useEffect(() => {
    const fetchProperty = async () => {
      if (!numericId) return;
      console.log(`🟢 Fetching property ID ${numericId} from backend...`);
      setLoading(true);
      try {
        // This hits your local backend, which queries Supabase
        const res = await fetch("http://localhost:5000/properties/list");
        if (!res.ok) {
            throw new Error(`Backend fetch failed with status: ${res.status}`);
        }
        const data = await res.json();
        const found = Array.isArray(data) ? data.find((p: any) => p.id === numericId) : null;
        
        if (!found) {
          console.error(`❌ Property not found (ID: ${numericId})`);
          setProperty(null);
          return;
        }

        let totalSupply = found.total_supply ?? 1; // Use DB total_supply, fallback to 1
        
        const isMeridian = numericId === 1; // Assuming the tokenized property is ID 1
        found.tokenId = isMeridian ? MERIDIAN_HTS_ID : found.tokenId;
        
        let tokenPriceUSD = found.price / totalSupply;
        let tokensRemaining = totalSupply;

        if (found.tokenId && found.tokenId !== "''") {
          console.log(`🟢 Fetching token info from Mirror Node for ${found.tokenId}...`);
          const info = await getTokenInfo(found.tokenId);
          if (info) {
            totalSupply = info.totalSupply;
            const balance = await getAccountTokenBalance(found.tokenId, TREASURY_ACCOUNT);
            tokensRemaining = balance;
            console.log(
              `ℹ️ PropertyDetail ${found.name} (${found.id}): totalSupply=${totalSupply}, tokensRemaining=${tokensRemaining}`
            );
          }
        }
        
        tokenPriceUSD = found.price / (totalSupply > 0 ? totalSupply : 1);

        setProperty({
          id: found.id,
          name: found.name,
          address: found.address || "Address not provided",
          price: found.price,
          tokenPriceUSD: tokenPriceUSD,
          totalTokens: totalSupply,
          tokensRemaining: tokensRemaining,
          tokenId: found.tokenId,
          description: found.description || "No description available.",
          details: found.details || { occupancyRate: 94, yearBuilt: 2022, type: "Mixed-use", units: 48 },
          heroImage: found.hero_image_url || "/src/assets/hero-meridian.jpg",
          detailImage: found.detail_image_url || "/src/assets/test-meridian.jpg",
        });
      } catch (err) {
        console.error("❌ Failed to fetch property:", err);
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [numericId]);

  // --- HBAR Buy Logic (Sign Only + Backend Submission) ---
  const handleBuyToken = async () => {
    if (!isConnected || !accountId) {
      toast({ title: "Connection Error", description: "Please connect your wallet first.", variant: "destructive" });
      return;
    }

    if (!property || !property.tokenPriceUSD || !property.tokenId) {
      toast({ title: "Data Error", description: "Property token data is missing.", variant: "destructive" });
      return;
    }

    const tokensToBuy = Number(amount);
    if (isNaN(tokensToBuy) || tokensToBuy <= 0) {
      toast({ title: "Input Error", description: "Please enter a valid amount (> 0).", variant: "destructive" });
      return;
    }
    
    // --- CALCULATE COST ---
    const totalCostUSD = tokensToBuy * property.tokenPriceUSD;
    const totalCostHbar = Math.ceil((totalCostUSD / HBAR_USD_RATE) * 1000) / 1000; 
    
    console.log(
      `🟢 Initiating HBAR SIGNATURE Request. Cost: ${totalCostHbar.toFixed(3)} ℏ`
    );

    try {
      setBuying(true);
      toast({ title: "Signing Required (1/2)", description: `Please sign the ${totalCostHbar.toFixed(3)} ℏ payment transaction in HashPack.`, variant: "default" });

      // 1. ❗️ CRITICAL FIX: Call signHbarPayment with all 3 required arguments
      const submissionResult = await signHbarPayment(
          totalCostHbar, 
          accountId,
          tokensToBuy // Pass token amount for backend fulfillment
      ); 

      // 2. The signHbarPayment function now handles BOTH signing and submitting to backend
      toast({
          title: "Swap Completed Successfully",
          description: `Backend executed transfer. You should receive ${tokensToBuy} tokens.`,
          // ❗️ CRITICAL FIX: Removed invalid variant: "success"
      });
      
      // Reload to show new token balance (on dashboard) and new tokens remaining
      window.location.reload(); 

    } catch (err) {
      console.error("❌ Transaction execution failed:", err);
      toast({
          title: "Transaction Failed",
          description: `Failed to execute: ${err instanceof Error ? err.message : 'Unknown Error'}`,
          variant: "destructive",
      });
    } finally {
      setBuying(false);
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-500">Loading property...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-500"> Property not found (ID: {numericId}) </p>
      </div>
    );
  }

  // Calculate values for UI
  const { 
    tokensRemaining = 0, 
    totalTokens = 0, 
    details, 
    price = 0, 
    expectedReturn = 0, 
    tokenPriceUSD = 0,
    address = "N/A",
    name = "Property",
    detailImage,
    heroImage
  } = property;
  
  const totalPurchaseHbar = (amount * tokenPriceUSD / HBAR_USD_RATE).toFixed(3);
  const pricePerTokenHbar = (tokenPriceUSD / HBAR_USD_RATE).toFixed(3);

  return (
    <div className="space-y-6 container mx-auto px-4 py-8">
      <Card className="overflow-hidden">
        <div className="relative">
          <img
            src={detailImage || heroImage}
            alt={name}
            className="w-full h-[400px] object-cover"
          />
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-green-500 text-white">
              {details?.occupancyRate}% Occupied
            </Badge>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          <h3 className="text-2xl font-semibold mb-3">{name}</h3>
          <p className="text-muted-foreground">{address}</p>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Type: {details?.type}</div>
            <div>Year Built: {details?.yearBuilt}</div>
            <div>Price: ${price.toLocaleString()}</div>
            <div>Expected Return: {expectedReturn}%</div>
          </div>
          
          <p className="font-semibold pt-2 border-t">
            Price per token: <strong>${tokenPriceUSD.toFixed(2)} USD</strong> ({pricePerTokenHbar} ℏ)
          </p>
          <p className="text-sm text-muted-foreground">
            Exchange Rate: 1 USD = { (1 / HBAR_USD_RATE).toFixed(0)} ℏ (Simulated)
          </p>


          <div className="pt-4 border-t">
            <label className="text-sm font-medium mb-2 block">Number of tokens to buy:</label>
            <div className="flex items-center space-x-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount(Math.max(1, amount - 1))}
                disabled={amount <= 1}
              >
                -
              </Button>
              <span className="px-4 py-2 border rounded-md min-w-[60px] text-center">{amount}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setAmount(Math.min(tokensRemaining, amount + 1))
                }
                disabled={amount >= tokensRemaining}
              >
                +
              </Button>
            </div>

            {!isConnected ? (
              <Button variant="investment" className="w-full" size="lg" onClick={connectWallet}>
                Connect Wallet
              </Button>
            ) : (
              <Button 
                variant="investment" 
                className="w-full" 
                size="lg" 
                onClick={handleBuyToken}
                disabled={buying || !isConnected || tokensRemaining < amount}
              >
                <Users className="mr-2 h-4 w-4" />
                {buying ? "Awaiting Signature..." : `Pay ${totalPurchaseHbar} ℏ to Buy ${amount} Token(s)`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyDetail;