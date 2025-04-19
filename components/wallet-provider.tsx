"use client"

import type React from "react"

import { useMemo } from "react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

// Use the provided Alchemy RPC URL
const SOLANA_RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/5hFqSwkAoE9n4n0cb733mEY9qhwyvGJj"

export default function WalletContextProvider({ children }: { children: React.ReactNode }) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.MainnetBeta

  // Use the provided Alchemy RPC URL
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || SOLANA_RPC_URL
  }, [])

  // Only using Phantom wallet as requested
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  // Configure connection options to disable WebSocket
  const connectionConfig = useMemo(
    () => ({
      commitment: "confirmed",
      disableRetryOnRateLimit: false,
      httpHeaders: { "Content-Type": "application/json" },
      wsEndpoint: null, // Disable WebSocket connection
    }),
    [],
  )

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
