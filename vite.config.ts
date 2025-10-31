import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "localhost", // use explicit host
    port: 8080,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "localhost-key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "localhost.pem")),
    },
  },
  plugins: [react()], // 🧹 removed "lovable-tagger"
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
