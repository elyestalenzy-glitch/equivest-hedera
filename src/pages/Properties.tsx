// src/pages/Properties.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PropertyCard from "@/components/ui/PropertyCard";
import PropertyForm from "@/components/PropertyForm";
import VerifyHCSForm from "@/components/VerifyHCSForm"; 
import { Input } from "@/components/ui/input"; 
import { toast } from "@/hooks/use-toast";
import { getTokenInfo, getAccountTokenBalance } from "@/lib/mirrorNode";

interface Property {
  id: number;
  name: string;
  price: number;
  tokenId: string;
  totalSupply: number;
  tokensRemaining: number;
  heroImageUrl: string;
  detailImageUrl: string;
}

const TREASURY_ACCOUNT = "0.0.7091969"; 

const Properties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  // Admin States
  const [showVerifyForm, setShowVerifyForm] = useState(false); 
  const [showDeleteModal, setShowDeleteModal] = useState(false); 
  const [deleteInput, setDeleteInput] = useState(""); 

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        console.log("🟢 Fetching properties from backend...");
        
        const res = await fetch("http://localhost:5000/properties/list"); 
        const data = await res.json();

        if (!Array.isArray(data)) throw new Error("Invalid backend response");

        const enriched: Property[] = await Promise.all(
          data.map(async (prop: any) => {
            let totalSupply = prop.totalSupply ?? 0;
            let tokensRemaining = totalSupply;
            let usingMirrorNode = false;

            if (prop.tokenId && prop.tokenId !== "''") {
              try {
                console.log(`🟢 Fetching token info from Mirror Node for ${prop.tokenId}...`);
                const info = await getTokenInfo(prop.tokenId);
                if (info) {
                  usingMirrorNode = true;
                  totalSupply = info.totalSupply;
                  const balance = await getAccountTokenBalance(prop.tokenId, TREASURY_ACCOUNT);
                  tokensRemaining = balance;
                }
              } catch (err) {
                console.warn(`⚠️ Failed to fetch Mirror Node info for ${prop.name}:`, err);
              }
            }

            return {
              ...prop,
              totalSupply: prop.totalSupply ?? totalSupply,
              tokensRemaining,
            };
          })
        );

        setProperties(enriched);
        console.log("✅ Fetched all properties with Mirror Node info");
      } catch (err) {
        console.error("❌ Failed to fetch properties:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const handleCreateProperty = () => setShowForm(true);
  const handleCloseForm = () => setShowForm(false);

  const handleNewProperty = (newProperty: any) => {
    setProperties((prev) => [...prev, newProperty]);
    setShowForm(false);
  };
  
  const handleOpenVerifyForm = () => setShowVerifyForm(true);
  const handleCloseVerifyForm = () => setShowVerifyForm(false);
  const handleOpenDeleteModal = () => setShowDeleteModal(true);
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteInput("");
  };

  const handleConfirmDelete = async () => {
    const id = Number(deleteInput);
    if (isNaN(id) || id <= 0) {
        toast({ title: "Error", description: "Please enter a valid Property ID.", variant: "destructive" });
        return;
    }
    
    try {
        const deleteUrl = `http://localhost:5000/properties/${id}`;
        console.log(`Attempting DELETE request to: ${deleteUrl}`);
        
        const response = await fetch(deleteUrl, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }, 
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Raw server error text:", text.substring(0, 200) + "...");
            
            try {
                const err = JSON.parse(text);
                throw new Error(err.error || `Deletion failed with status ${response.status}.`);
            } catch {
                throw new Error(`Server returned non-JSON error (Status ${response.status}). Check backend console.`);
            }
        }
        
        setProperties(prev => prev.filter(p => p.id !== id));
        handleCloseDeleteModal();
        toast({ title: "Deleted!", description: `Property ID ${id} has been removed.`, variant: "destructive" });
        
    } catch (err) {
        console.error("❌ Deletion failed:", err);
        toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-500">Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 container mx-auto px-4">
      
      {/* 1. HEADER (Stable Display) */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Properties</h1>
        <div className="w-1"></div> 
      </div>

      {/* 2. PROPERTY LIST (Main Content) */}
      {/* Retained the original grid structure for stability, knowing the conflict is external. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
        {properties.length === 0 ? (
          <p className="text-gray-500 text-center col-span-full">No properties available.</p>
        ) : (
          properties.map((prop) => {
            const tokensSold = prop.totalSupply - prop.tokensRemaining;
            return (
              <Link key={prop.id} to={`/properties/${prop.id}`}>
                <PropertyCard
                  id={prop.id.toString()}
                  name={prop.name}
                  price={prop.price}
                  heroImage={prop.heroImageUrl}
                  detailImage={prop.detailImageUrl}
                  totalTokens={prop.totalSupply}
                  tokensRemaining={prop.tokensRemaining}
                  tokensSold={tokensSold}
                />
              </Link>
            );
          })
        )}
      </div>
      
      {/* 3. ADMIN CONTROL ROW (Placed AFTER the list) */}
      <div className="p-6 border rounded-xl bg-gray-50 shadow-inner mt-10 flex justify-start space-x-3">
          <Button onClick={handleCreateProperty}>Create Property</Button>
          <Button variant="destructive" onClick={handleOpenDeleteModal}>Delete Property</Button>
          <Button variant="secondary" onClick={handleOpenVerifyForm}>Verify House</Button>
      </div>

      {/* Modals/Forms are rendered here */}
      {showForm && <PropertyForm onClose={handleCloseForm} onCreate={handleNewProperty} />}
      {showVerifyForm && <VerifyHCSForm onClose={handleCloseVerifyForm} />}
      
      {/* Simple Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-sm relative">
                <h2 className="text-xl font-bold mb-4 text-red-600">Delete Property</h2>
                <p className="mb-4 text-sm">Enter the ID of the property to permanently delete it.</p>
                <Input 
                    type="number" 
                    placeholder="Property ID (e.g., 1)" 
                    value={deleteInput} 
                    onChange={(e) => setDeleteInput(e.target.value)} 
                    required 
                />
                <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={handleCloseDeleteModal}>Cancel</Button>
                    <Button variant="destructive" onClick={handleConfirmDelete} disabled={!deleteInput}>Delete</Button>
                </div>
            </div>
        </div>
      )}
      
    </div>
  );
};

export default Properties;