import { PublicKey } from "@solana/web3.js"
import { savePoolCreation } from "./db"
import type { WalletAdapter } from "./wallet"
import { createRaydiumPool, isToken2022Token as checkToken2022 } from "./raydium-direct"
import { createHttpOnlyConnection } from "./http-only-connection"
import { PRIMARY_RPC_URL, getFallbackRpcUrl } from "./constants"

interface CreateLiquidityPoolParams {
  wallet: WalletAdapter
  baseTokenMint: string
  quoteTokenMint: string
  baseAmount: number
  quoteAmount: number
  onProgress?: (message: string) => void
}

interface CreateLiquidityPoolResult {
  signature: string
  poolId: string
  ammId: string
}

export async function createLiquidityPool({
  wallet,
  baseTokenMint,
  quoteTokenMint,
  baseAmount,
  quoteAmount,
  onProgress,
}: CreateLiquidityPoolParams): Promise<CreateLiquidityPoolResult> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected")
  }

  const logProgress = (message: string) => {
    console.log(message)
    if (onProgress) onProgress(message)
  }

  try {
    logProgress("Starting test transaction process...")

    // Try with primary RPC first
    logProgress("Connecting to Solana using primary RPC...")
    let connection = createHttpOnlyConnection(PRIMARY_RPC_URL, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 120000, // 2 minutes
    })

    // Test the connection by trying to get a blockhash
    try {
      await connection.getLatestBlockhash()
      logProgress("Connected to Solana using primary RPC")
    } catch (error) {
      // If primary RPC fails, try a fallback
      logProgress("Primary RPC connection failed, trying fallback...")
      const fallbackUrl = getFallbackRpcUrl()
      logProgress(`Using fallback RPC: ${fallbackUrl}`)
      connection = createHttpOnlyConnection(fallbackUrl, {
        commitment: "confirmed",
        confirmTransactionInitialTimeout: 120000, // 2 minutes
      })

      // Test the fallback connection
      try {
        await connection.getLatestBlockhash()
        logProgress("Connected to Solana using fallback RPC")
      } catch (fallbackError) {
        throw new Error("Failed to connect to any Solana RPC endpoint")
      }
    }

    // Convert addresses to PublicKeys
    const baseTokenMintPubkey = new PublicKey(baseTokenMint)
    const quoteTokenMintPubkey = new PublicKey(quoteTokenMint)
    logProgress("Token mints converted to PublicKeys")

    // Create a simple test transaction
    logProgress("Creating test transaction...")

    // Set a timeout for the transaction
    const poolCreationPromise = createRaydiumPool({
      connection,
      wallet,
      baseMint: baseTokenMintPubkey,
      quoteMint: quoteTokenMintPubkey,
      baseAmount,
      quoteAmount,
      onProgress: logProgress,
    })

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Operation timed out after 3 minutes"))
      }, 180000) // 3 minute timeout
    })

    // Race the promises
    const result = await Promise.race([poolCreationPromise, timeoutPromise])

    logProgress("Test transaction sent: " + result.signature)

    // Save test data to database
    logProgress("Saving test data to database...")
    try {
      const poolData = {
        base_token_mint: baseTokenMint,
        quote_token_mint: quoteTokenMint,
        base_amount: baseAmount,
        quote_amount: quoteAmount,
        creator: wallet.publicKey.toString(),
        tx_signature: result.signature,
        pool_id: result.poolId,
        amm_id: result.ammId,
      }

      await savePoolCreation(poolData)
      logProgress("Test data saved to database")
    } catch (dbError) {
      console.error("Error saving test data to database:", dbError)
      logProgress("Warning: Failed to save test data to database, but test was successful")
      // Continue even if database save fails
    }

    logProgress("Test transaction process completed successfully")
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error in createLiquidityPool:", error)
    logProgress("Error: " + errorMessage)

    // Provide more specific error messages for common issues
    if (errorMessage.includes("timed out")) {
      if (errorMessage.includes("Wallet signature request timed out")) {
        throw new Error(
          "Wallet signature request timed out. Please check your wallet for a pending approval notification and try again.",
        )
      } else {
        throw new Error("Operation timed out. The Solana network may be congested. Please try again later.")
      }
    }

    throw new Error(`Failed to create test transaction: ${errorMessage}`)
  }
}

// Function to check if a pool already exists for a token pair
export async function checkPoolExists(baseTokenMint: string, quoteTokenMint: string): Promise<boolean> {
  try {
    console.log("Checking if pool exists for token pair:", baseTokenMint, quoteTokenMint)

    // For now, we'll return false to allow pool creation to proceed
    return false
  } catch (error) {
    console.error("Error checking if pool exists:", error)
    return false
  }
}

// Re-export the isToken2022Token function
export { checkToken2022 as isToken2022Token }
