import { Connection, type ConnectionConfig } from "@solana/web3.js"

// Create a custom HTTP-only connection class
export class HttpOnlyConnection extends Connection {
  constructor(endpoint: string, commitmentOrConfig?: string | ConnectionConfig) {
    // Force WebSocket to be disabled
    const config =
      typeof commitmentOrConfig === "string"
        ? { commitment: commitmentOrConfig, wsEndpoint: false }
        : { ...commitmentOrConfig, wsEndpoint: false }

    super(endpoint, config)
  }

  // Override methods that might use WebSockets to use HTTP polling instead
  async confirmTransaction(signature: string, commitment?: string): Promise<any> {
    // Use HTTP polling instead of WebSocket subscription
    let confirmed = false
    let retries = 0
    const maxRetries = 30

    while (!confirmed && retries < maxRetries) {
      const status = await this.getSignatureStatus(signature)
      if (status && status.value && status.value.confirmationStatus === (commitment || "confirmed")) {
        confirmed = true
        return { context: { slot: status.context.slot }, value: status.value }
      } else {
        retries++
        // Wait 2 seconds between checks
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    throw new Error("Transaction confirmation timed out")
  }
}

// Use the provided Alchemy RPC URL
const SOLANA_RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/5hFqSwkAoE9n4n0cb733mEY9qhwyvGJj"

// Create a connection with WebSocket completely disabled
export function createHttpOnlyConnection() {
  return new HttpOnlyConnection(SOLANA_RPC_URL, {
    commitment: "confirmed",
    disableRetryOnRateLimit: false,
    confirmTransactionInitialTimeout: 60000, // 60 seconds
    httpHeaders: { "Content-Type": "application/json" },
    wsEndpoint: false, // Completely disable WebSocket
  })
}
