// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import { WalletProvider } from "@/context/WalletContext"; // <-- import WalletProvider
import "./index.css";
import { Buffer } from "buffer";

// Polyfill Buffer globally
window.Buffer = window.Buffer || Buffer;

createRoot(document.getElementById("root")!).render(
  <WalletProvider>
    <App />
  </WalletProvider>
);
