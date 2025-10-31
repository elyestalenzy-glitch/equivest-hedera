import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ES module __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env explicitly from backend folder
dotenv.config({ path: path.resolve(__dirname, ".env") });
console.log("🔍 ENV path:", path.resolve(__dirname, ".env"));
console.log("🔍 SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("🔍 SUPABASE_SERVICE_KEY =", process.env.SUPABASE_SERVICE_KEY ? "✅ Loaded" : "❌ Missing");


// Initialize Supabase client with service role (backend access)
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
