import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import tokenCreateRoutes from "./routes/tokenCreateRoutes.js";
import tokenRegisterRoutes from "./routes/tokenRegisterRoutes.js";
import propertiesRoutes from "./routes/propertiesRoutes.js"; 
import verifyHTSRoutes from "./routes/verifyHTSRoutes.js"; // ⬅️ 1. IMPORT HCS ROUTE
import { Client, PrivateKey } from "@hashgraph/sdk";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Hedera client (for HTS creation)
if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
  console.error("❌ Operator ID or key missing in .env");
  process.exit(1);
}

const client = Client.forTestnet();
client.setOperator(
  process.env.HEDERA_OPERATOR_ID,
  PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY)
);

console.log("✅ Hedera client initialized");

// Health check route
app.get("/", (_req, res) => res.send("Hedera backend running"));

// Routes
app.use("/tokens", tokenCreateRoutes(client));
app.use("/tokens/register", tokenRegisterRoutes);
console.log("🔹 /tokens/register route mounted");

// Supabase properties route
app.use("/properties", propertiesRoutes);
console.log("🔹 /properties route mounted");

// ⬅️ 2. REGISTER HCS VERIFICATION ROUTE
app.use("/api/verify", verifyHTSRoutes(client));
console.log("🔹 /api/verify route mounted (HCS)");

// --- NEW: start the HTS bridge ---
//initBridge();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));