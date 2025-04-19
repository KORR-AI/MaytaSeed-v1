import type {
  PublicKey,
  SendOptions,
  Commitment,
  ConnectionConfig,
  RpcResponseAndContext,
  SignatureResult,
} from "@solana/web3.js"

// Use the provided Alchemy RPC URL
const SOLANA_RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/5hFqSwkAoE9n4n0cb733mEY9qhwyvGJj"

/**
 * A completely custom HTTP-only connection implementation that doesn't use WebSockets at all
 */
export class HttpOnlyConnection {
  private endpoint: string
  private commitment: Commitment
  private confirmTransactionInitialTimeout: number

  constructor(endpoint: string = SOLANA_RPC_URL, commitmentOrConfig: Commitment | ConnectionConfig = "confirmed") {
    this.endpoint = endpoint

    if (typeof commitmentOrConfig === "string") {
      this.commitment = commitmentOrConfig
      this.confirmTransactionInitialTimeout = 60000
    } else {
      this.commitment = commitmentOrConfig.commitment || "confirmed"
      this.confirmTransactionInitialTimeout = commitmentOrConfig.confirmTransactionInitialTimeout || 60000
    }
  }

  // Send a JSON-RPC request using fetch (no WebSockets)
  private async sendJsonRpc(method: string, params: any[]): Promise<any> {
    try {
      console.log(`Sending RPC request: ${method}`, params)

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        console.error(`RPC error for method ${method}:`, data.error)
        throw new Error(`RPC error: ${JSON.stringify(data.error)}`)
      }

      console.log(`RPC response for ${method}:`, data.result)
      return data.result
    } catch (error) {
      console.error(`Error in sendJsonRpc for method ${method}:`, error)
      throw error
    }
  }

  // Get account info
  async getAccountInfo(publicKey: PublicKey, commitment?: Commitment): Promise<any> {
    try {
      console.log("Getting account info for:", publicKey.toString())
      const result = await this.sendJsonRpc("getAccountInfo", [
        publicKey.toString(),
        { encoding: "base64", commitment: commitment || this.commitment },
      ])
      return result?.value
    } catch (error) {
      console.error("Error in getAccountInfo:", error)
      throw error
    }
  }

  // Get latest blockhash - FIXED VERSION
  async getLatestBlockhash(commitment?: Commitment): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    try {
      console.log("Getting latest blockhash...")

      // The correct method name is "getLatestBlockhash"
      // The correct parameter format is an object with a commitment field
      const commitmentConfig = { commitment: commitment || this.commitment }

      const result = await this.sendJsonRpc("getLatestBlockhash", [commitmentConfig])

      // Check if we got a valid response
      if (!result || !result.value || !result.value.blockhash) {
        console.error("Invalid response from getLatestBlockhash:", result)
        throw new Error("Failed to get latest blockhash: Invalid response format")
      }

      console.log("Got blockhash:", result.value.blockhash)

      // Return the correct format
      return {
        blockhash: result.value.blockhash,
        lastValidBlockHeight: result.value.lastValidBlockHeight || 0,
      }
    } catch (error) {
      console.error("Error in getLatestBlockhash:", error)
      throw new Error(`Failed to get latest blockhash: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Get minimum balance for rent exemption
  async getMinimumBalanceForRentExemption(size: number): Promise<number> {
    try {
      console.log("Getting minimum balance for rent exemption for size:", size)
      const result = await this.sendJsonRpc("getMinimumBalanceForRentExemption", [size])
      return result
    } catch (error) {
      console.error("Error in getMinimumBalanceForRentExemption:", error)
      throw error
    }
  }

  // Send transaction
  async sendRawTransaction(
    rawTransaction: Buffer | Uint8Array | Array<number>,
    options?: SendOptions,
  ): Promise<string> {
    try {
      console.log("Sending raw transaction...")
      const encodedTransaction = Buffer.from(rawTransaction).toString("base64")
      const result = await this.sendJsonRpc("sendTransaction", [
        encodedTransaction,
        {
          encoding: "base64",
          skipPreflight: options?.skipPreflight || false,
          preflightCommitment: options?.preflightCommitment || this.commitment,
        },
      ])
      console.log("Transaction sent with signature:", result)
      return result
    } catch (error) {
      console.error("Error in sendRawTransaction:", error)
      throw error
    }
  }

  // Get transaction status
  async getSignatureStatus(
    signature: string,
    config?: { searchTransactionHistory: boolean },
  ): Promise<RpcResponseAndContext<SignatureResult | null>> {
    try {
      console.log("Getting signature status for:", signature)
      const result = await this.sendJsonRpc("getSignatureStatuses", [[signature], config])
      return {
        context: { slot: result.context.slot },
        value: result.value[0],
      }
    } catch (error) {
      console.error("Error in getSignatureStatus:", error)
      throw error
    }
  }

  // Confirm transaction using HTTP polling
  async confirmTransaction(
    signature: string,
    commitment?: Commitment,
  ): Promise<RpcResponseAndContext<SignatureResult>> {
    try {
      console.log("Confirming transaction:", signature)
      const timeoutMs = this.confirmTransactionInitialTimeout
      const startTime = Date.now()
      const confirmCommitment = commitment || this.commitment

      while (Date.now() - startTime < timeoutMs) {
        const { value: status } = await this.getSignatureStatus(signature)

        if (status) {
          if (status.err) {
            console.error("Transaction failed:", status.err)
            throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
          }

          if (
            (confirmCommitment === "finalized" && status.confirmationStatus === "finalized") ||
            (confirmCommitment === "confirmed" &&
              (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) ||
            confirmCommitment === "processed"
          ) {
            console.log("Transaction confirmed with status:", status.confirmationStatus)
            return { context: { slot: 0 }, value: status }
          }
        }

        console.log("Transaction not confirmed yet, waiting...")
        // Wait before checking again
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }

      throw new Error(`Transaction confirmation timeout after ${timeoutMs}ms`)
    } catch (error) {
      console.error("Error in confirmTransaction:", error)
      throw error
    }
  }
}

// Create a connection with no WebSocket dependency
export function createHttpOnlyConnection(
  endpoint: string = SOLANA_RPC_URL,
  commitmentOrConfig: Commitment | ConnectionConfig = "confirmed",
): HttpOnlyConnection {
  return new HttpOnlyConnection(endpoint, commitmentOrConfig)
}
