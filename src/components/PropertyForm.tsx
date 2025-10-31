// src/components/PropertyForm.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { supabase } from "@/lib/SupabaseClient"; 

// Define the props interface
interface PropertyFormProps {
    onClose: () => void;
    onCreate: (newProperty: any) => void;
}

// Defines ALL fields sent by the form
interface NewProperty {
    name: string;
    address: string;
    description: string;
    price: number;
    total_tokens: number;
}

export default function PropertyForm({ onClose, onCreate }: PropertyFormProps) {
    const [property, setProperty] = useState<NewProperty>({
        name: "",
        address: "",
        description: "",
        price: 0,
        total_tokens: 1000,
    });
    const [isLoading, setIsLoading] = useState(false);

    const [heroFile, setHeroFile] = useState<File | null>(null);
    const [detailFile, setDetailFile] = useState<File | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProperty(prev => ({
            ...prev,
            [name]: name === "price" || name === "total_tokens" ? Number(value) : value,
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (e.target.name === "hero_image") {
            setHeroFile(file);
        } else if (e.target.name === "detail_image") {
            setDetailFile(file);
        }
    };

    const uploadFile = async (file: File | null) => {
        if (!file) {
            return null;
        }

        const fileName = `${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
            .from("property-images") 
            .upload(fileName, file);

        if (error) {
            console.error("Supabase upload error:", error);
            throw new Error(`Failed to upload ${file.name}. Ensure storage policies are public for 'insert'.`);
        }

        const { data: publicUrlData } = supabase.storage
            .from("property-images")
            .getPublicUrl(fileName);
            
        return publicUrlData.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            toast({ title: "Uploading images (if selected)..." });
            
            const heroImageUrl = await uploadFile(heroFile);
            const detailImageUrl = await uploadFile(detailFile);

            // CRITICAL FIX: Map ALL frontend data to the exact column names required by your SQL schema.
            const newPropertyData = {
                // Fields from form state (correctly named for the database):
                name: property.name,
                address: property.address,
                description: property.description,
                price: property.price,
                total_tokens: property.total_tokens,

                // Map snake_case vars to your existing PascalCase DB columns:
                "heroImageUrl": heroImageUrl,       // Maps to DB column "heroImageUrl"
                "detailImageUrl": detailImageUrl,   // Maps to DB column "detailImageUrl"

                // Send required defaults for existing columns that are not in the form state:
                "tokenId": "",
                "totalSupply": property.total_tokens,
                status: "draft",
            };

            // Send to backend
            toast({ title: "Creating property..." });
            const response = await fetch("http://localhost:5000/properties", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPropertyData),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `Backend failed with status ${response.status}`);
            }

            const newProperty = await response.json();
            toast({ title: "Success!", description: "New property created." });
            
            onCreate(newProperty);
            onClose();
            
        } catch (err) {
            console.error("Property creation failed:", err);
            toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
                
                <h1 className="text-2xl font-bold mb-4">Create New Property</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input name="name" placeholder="Property Name" value={property.name} onChange={handleChange} required />
                    <Input name="address" placeholder="Address" value={property.address} onChange={handleChange} required />
                    <Textarea name="description" placeholder="Description" value={property.description} onChange={handleChange} />
                    <Input name="price" type="number" placeholder="Total Price (USD)" value={property.price} onChange={handleChange} required />
                    <Input name="total_tokens" type="number" placeholder="Total Tokens" value={property.total_tokens} onChange={handleChange} required />

                    {/* File inputs are optional */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Hero Image (Optional)</label>
                        <Input name="hero_image" type="file" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Detail Image (Optional)</label>
                        <Input name="detail_image" type="file" accept="image/*" onChange={handleFileChange} />
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Create Property"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}