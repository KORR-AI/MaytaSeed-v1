import type { PublicKey } from "@solana/web3.js"

// Use the provided Alchemy RPC URL
const SOLANA_RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/5hFqSwkAoE9n4n0cb733mEY9qhwyvGJj"

// Create a pure HTTP connection that doesn't use WebSockets at all
export class PureHttpConnection {
  private rpcUrl: string
  private commitment: string

  constructor(rpcUrl: string = SOLANA_RPC_URL, commitment = "confirmed") {
    this.rpcUrl = rpcUrl
    this.commitment = commitment
  }

  // Send a JSON-RPC request using fetch (no WebSockets)
  private async sendJsonRpc(method: string, params: any[]): Promise<any> {
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    if (data.error) {
      throw new Error(`RPC error: ${JSON.stringify(data.error)}`)
    }

    return data.result
  }

  // Get account info
  async getAccountInfo(publicKey: PublicKey): Promise<any> {
    const result = await this.sendJsonRpc("getAccountInfo", [
      publicKey.toString(),
      { encoding: "base64", commitment: this.commitment },
    ])
    return result?.value
  }

  // Get latest blockhash
  async getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    return await this.sendJsonRpc("getLatestBlockhash", [{ commitment: this.commitment }])
  }

  // Get minimum balance for rent exemption
  async getMinimumBalanceForRentExemption(size: number): Promise<number> {
    return await this.sendJsonRpc("getMinimumBalanceForRentExemption", [size])
  }

  // Send transaction
  async sendRawTransaction(rawTransaction: Buffer | Uint8Array | Array<number>): Promise<string> {
    const encodedTransaction = Buffer.from(rawTransaction).toString("base64")
    return await this.sendJsonRpc("sendTransaction", [
      encodedTransaction,
      { encoding: "base64", skipPreflight: false, preflightCommitment: this.commitment },
    ])
  }

  // Get transaction status
  async getSignatureStatus(signature: string): Promise<any> {
    const result = await this.sendJsonRpc("getSignatureStatuses", [[signature]])
    return result?.value?.[0]
  }

  // Confirm transaction using HTTP polling
  async confirmTransaction(signature: string, timeoutMs = 60000): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getSignatureStatus(signature)

      if (status) {
        if (status.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
        }

        if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
          return true
        }
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    throw new Error(`Transaction confirmation timeout after ${timeoutMs}ms`)
  }
}

// Create a connection with no WebSocket dependency
export function createPureHttpConnection(): PureHttpConnection {
  return new PureHttpConnection()
}
