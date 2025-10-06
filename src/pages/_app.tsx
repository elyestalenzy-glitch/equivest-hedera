// src/pages/_app.tsx
import type { AppProps } from "next/app";
import { WalletProvider } from "@/context/WalletContext";
import "@/styles/globals.css"; // adjust if your CSS path differs

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <Component {...pageProps} />
    </WalletProvider>
  );
}

export default MyApp;
    