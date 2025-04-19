"use client"

import type React from "react"

import { useMemo, useEffect } from "react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

// Use the provided Alchemy RPC URL
const SOLANA_RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/5hFqSwkAoE9n4n0cb733mEY9qhwyvGJj"

// Disable WebSocket globally
if (typeof window !== "undefined") {
  // Store the original WebSocket constructor
  const OriginalWebSocket = window.WebSocket

  // Create a dummy WebSocket that throws an error when used
  class DisabledWebSocket extends OriginalWebSocket {
    constructor(url: string, protocols?: string | string[]) {
      // If it's a Solana WebSocket URL, throw an error
      if (url.includes("solana") || url.includes("alchemy")) {
        console.warn("WebSocket connection blocked:", url)
        // Instead of throwing, we'll create a dummy WebSocket that does nothing
        super("wss://localhost:1234") // This will fail silently
        this.close() // Immediately close it
      } else {
        // For non-Solana WebSockets, use the original implementation
        super(url, protocols)
      }
    }
  }

  // Replace the global WebSocket constructor
  window.WebSocket = DisabledWebSocket as any
}

export default function WalletContextProvider({ children }: { children: React.ReactNode }) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.MainnetBeta

  // Use the provided Alchemy RPC URL
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || SOLANA_RPC_URL
  }, [])

  // Only using Phantom wallet as requested
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  // Configure connection options to completely disable WebSocket
  const connectionConfig = useMemo(
    () => ({
      commitment: "confirmed",
      disableRetryOnRateLimit: false,
      confirmTransactionInitialTimeout: 120000, // 2 minutes
      httpHeaders: { "Content-Type": "application/json" },
      wsEndpoint: false, // Completely disable WebSocket
    }),
    [],
  )

  // Add a global error handler for WebSocket errors
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalAddEventListener = window.addEventListener

      window.addEventListener = function (type, listener, options) {
        if (type === "error") {
          const wrappedListener = function (event) {
            // Check if it's a WebSocket error
            if (event && event.message && (event.message.includes("WebSocket") || event.message.includes("ws error"))) {
              console.warn("WebSocket error intercepted:", event.message)
              // Prevent the error from propagating
              event.stopPropagation()
              event.preventDefault()
              return false
            }
            // Otherwise, call the original listener
            return listener.apply(this, arguments)
          }

          return originalAddEventListener.call(this, type, wrappedListener, options)
        }

        return originalAddEventListener.call(this, type, listener, options)
      }
    }
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
