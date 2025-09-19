import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, TrendingUp, Shield, ExternalLink } from "lucide-react";
import testProperty from "@/assets/test-property.jpg";
import { toast } from "@/hooks/use-toast";

// Hardcoded property data for MVP
const propertyData = {
  id: "PROP-001",
  name: "Meridian Heights Residency",
  address: "2847 Oak Street, Downtown District, Metro City",
  price: 2500000,
  tokenPrice: 100,
  totalTokens: 25000,
  tokensRemaining: 12500,
  contractHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
  expectedReturn: 8.5,
  location: {
    neighborhood: "Downtown District", 
    city: "Metro City"
  },
  features: [
    "Prime downtown location",
    "24/7 security and concierge",
    "Rooftop amenities and pool",
    "Walking distance to transit"
  ],
  details: {
    type: "Mixed-use residential",
    yearBuilt: 2022,
    units: 48,
    occupancyRate: 94
  }
};

const Property = () => {
  const [tokensToBuy, setTokensToBuy] = useState(1);

  const handleBuyToken = () => {
    // Dummy buy function for MVP
    toast({
      title: "Purchase Initiated",
      description: `Attempting to purchase ${tokensToBuy} token(s) for $${tokensToBuy * propertyData.tokenPrice}`,
    });
    console.log(`Buying ${tokensToBuy} tokens...`);
  };

  const progressPercentage = ((propertyData.totalTokens - propertyData.tokensRemaining) / propertyData.totalTokens) * 100;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Badge variant="secondary" className="mb-4">
            Property Investment Opportunity
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
            {propertyData.name}
          </h1>
          <div className="flex items-center text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{propertyData.address}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Property Image & Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <div className="relative">
                <img 
                  src={testProperty} 
                  alt={propertyData.name}
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge variant="default" className="bg-success text-primary-foreground">
                    {propertyData.details.occupancyRate}% Occupied
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Property Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{propertyData.details.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Year Built:</span>
                        <span>{propertyData.details.yearBuilt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Units:</span>
                        <span>{propertyData.details.units}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{propertyData.location.neighborhood}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                    <ul className="space-y-1 text-sm">
                      {propertyData.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-success rounded-full mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Blockchain Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-success" />
                  Ownership Verified on Hedera
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  This property's ownership and tokenization are permanently recorded on the Hedera blockchain, ensuring transparency and security.
                </p>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Contract Hash:</span>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View on Explorer
                    </Button>
                  </div>
                  <code className="text-xs text-primary break-all">
                    {propertyData.contractHash}
                  </code>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investment Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Investment Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Property Value</span>
                  <span className="text-xl font-bold">${propertyData.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Token Price</span>
                  <span className="text-lg font-semibold">${propertyData.tokenPrice}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Expected Return</span>
                  <span className="text-lg font-semibold text-success flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    {propertyData.expectedReturn}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Token Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Sold: {propertyData.totalTokens - propertyData.tokensRemaining}</span>
                    <span>Remaining: {propertyData.tokensRemaining}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className="h-3 gradient-secondary rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {progressPercentage.toFixed(1)}% of tokens sold
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <label className="text-sm font-medium mb-2 block">
                    Number of tokens to buy:
                  </label>
                  <div className="flex items-center space-x-2 mb-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setTokensToBuy(Math.max(1, tokensToBuy - 1))}
                      disabled={tokensToBuy <= 1}
                    >
                      -
                    </Button>
                    <span className="px-4 py-2 border rounded-md min-w-[60px] text-center">
                      {tokensToBuy}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setTokensToBuy(Math.min(propertyData.tokensRemaining, tokensToBuy + 1))}
                      disabled={tokensToBuy >= propertyData.tokensRemaining}
                    >
                      +
                    </Button>
                  </div>

                  <div className="bg-muted rounded-lg p-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Total Cost:</span>
                      <span className="font-semibold">${(tokensToBuy * propertyData.tokenPrice).toLocaleString()}</span>
                    </div>
                  </div>

                  <Button 
                    variant="investment" 
                    className="w-full" 
                    size="lg"
                    onClick={handleBuyToken}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Buy Tokens
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Property;