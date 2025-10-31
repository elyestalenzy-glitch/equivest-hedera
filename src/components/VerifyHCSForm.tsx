
// src/components/VerifyHCSForm.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface VerifyFormProps {
    onClose: () => void;
}

export default function VerifyHCSForm({ onClose }: VerifyFormProps) {
    const [tokenId, setTokenId] = useState("");
    const [contractHash, setContractHash] = useState("");
    const [propertyId, setPropertyId] = useState(""); 
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);

        if (!tokenId || !contractHash || !propertyId) {
            toast({ title: "Error", description: "All fields are required.", variant: "destructive" });
            setIsVerifying(false);
            return;
        }

        try {
            toast({ title: "Submitting to HCS...", description: "Transaction initiated on the backend." });
            
            const response = await fetch("http://localhost:5000/api/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    propertyId: Number(propertyId),
                    fileHash: contractHash,
                    tokenId: tokenId,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HCS submission failed with status ${response.status}`);
            }

            const result = await response.json();
            toast({
                title: "HCS Verified!",
                description: `Tx ID: ${result.transactionId.substring(0, 15)}... Sequence: ${result.topicSequenceNumber}`,
            });
            
            onClose();

        } catch (err) {
            console.error("❌ HCS submission failed:", err);
            toast({ title: "Verification Failed", description: (err as Error).message, variant: "destructive" });
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
                
                <h1 className="text-2xl font-bold mb-4">Verify Property on HCS</h1>
                <p className="text-sm text-muted-foreground mb-4">Submit the property's HTS ID and the contract hash to the Hedera Consensus Service.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input name="propertyId" placeholder="Property ID (e.g., 1)" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required />
                    <Input name="tokenId" placeholder="House Token ID (e.g., 0.0.123456)" value={tokenId} onChange={(e) => setTokenId(e.target.value)} required />
                    <Input name="contractHash" placeholder="Contract Hash (SHA-256 of Legal Document)" value={contractHash} onChange={(e) => setContractHash(e.target.value)} required />
                    
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isVerifying}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isVerifying}>
                            {isVerifying ? "Submitting..." : "Submit to HCS"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}