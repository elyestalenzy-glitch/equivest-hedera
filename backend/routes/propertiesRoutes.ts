import { Router, Request, Response } from "express";
import { supabase } from "../supabaseClient.js"; 

const router = Router();

// GET /properties/list → returns all properties (for Properties.tsx list page)
router.get("/list", async (_req: Request, res: Response) => {
  try {
    console.log("GET /properties/list");
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json(data ?? []); 
  } catch (err: unknown) {
    console.error("❌ Unexpected error:", err);
    if (err instanceof Error) res.status(500).json({ error: err.message });
    else res.status(500).json({ error: "Unknown error" });
  }
});

// POST /properties → creates a new property (for PropertyForm.tsx)
router.post("/", async (req: Request, res: Response) => {
    console.log("POST /properties - Creating new property:", req.body);
    
    // req.body contains all data from the form, including image URLs
    const { data, error } = await supabase
        .from("properties")
        .insert([req.body]) 
        .select()
        .single(); 

    if (error) {
        console.error("❌ Supabase POST error:", error.message);
        return res.status(500).json({ error: error.message });
    }

    console.log("✅ Supabase insert success:", data);
    res.json(data); 
});

// DELETE /properties/:id → deletes a property (for Delete Modal)
router.delete("/:id", async (req: Request, res: Response) => {
    const propertyId = Number(req.params.id);
    console.log(`DELETE /properties/${propertyId} - Deleting property.`);

    if (isNaN(propertyId)) {
        return res.status(400).json({ error: "Invalid property ID." });
    }

    try {
        const { error } = await supabase
            .from("properties")
            .delete()
            .eq("id", propertyId);

        if (error) {
            console.error("❌ Supabase DELETE error:", error.message);
            return res.status(500).json({ error: error.message });
        }

        console.log(`✅ Property ID ${propertyId} deleted successfully.`);
        res.json({ success: true, id: propertyId });
    } catch (err: unknown) {
        console.error("❌ Unexpected DELETE error:", err);
        if (err instanceof Error) res.status(500).json({ error: err.message });
        else res.status(500).json({ error: "Unknown error" });
    }
});


export default router;