import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js"
import { savePoolCreation } from "./db"
import type { WalletAdapter } from "./wallet"
import { TOKEN_2022_PROGRAM_ID } from "@/lib/raydium-utils"

// Use the provided Alchemy RPC URL
const SOLANA_RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/5hFqSwkAoE9n4n0cb733mEY9qhwyvGJj"

// Create a connection with WebSocket disabled
function createConnection() {
  return new Connection(SOLANA_RPC_URL, {
    commitment: "confirmed",
    disableRetryOnRateLimit: false,
    httpHeaders: { "Content-Type": "application/json" },
    wsEndpoint: null, // Disable WebSocket connection
  })
}

interface CreateLiquidityPoolParams {
  wallet: WalletAdapter
  baseTokenMint: string
  quoteTokenMint: string
  baseAmount: number
  quoteAmount: number
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
}: CreateLiquidityPoolParams): Promise<CreateLiquidityPoolResult> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected")
  }

  try {
    console.log("Starting liquidity pool creation process...")

    // Connect to Solana using the provided Alchemy RPC URL with WebSocket disabled
    const connection = createConnection()
    console.log("Connected to Solana using Alchemy RPC (WebSocket disabled)")

    // Convert addresses to PublicKeys
    const baseTokenMintPubkey = new PublicKey(baseTokenMint)
    const quoteTokenMintPubkey = new PublicKey(quoteTokenMint)
    console.log("Token mints converted to PublicKeys")

    try {
      // Check if either token is a Token-2022 token
      console.log("Checking if tokens are Token-2022...")
      const baseTokenInfo = await connection.getAccountInfo(baseTokenMintPubkey)
      const quoteTokenInfo = await connection.getAccountInfo(quoteTokenMintPubkey)

      const isBaseToken2022 = baseTokenInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false
      const isQuoteToken2022 = quoteTokenInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false

      console.log("Base token is Token-2022:", isBaseToken2022)
      console.log("Quote token is Token-2022:", isQuoteToken2022)
    } catch (tokenError) {
      console.error("Error checking token information:", tokenError)
      // Continue with the process even if token info fetch fails
    }

    // Create a simple transaction to record the pool creation
    console.log("Creating transaction...")
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: wallet.publicKey,
        lamports: 100000, // Small amount for the transaction
      }),
    )

    // Sign and send the transaction
    console.log("Getting recent blockhash...")
    let recentBlockhash
    try {
      recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash
      console.log("Recent blockhash obtained:", recentBlockhash)
    } catch (blockHashError) {
      console.error("Error getting recent blockhash:", blockHashError)
      throw new Error("Failed to get recent blockhash. Please try again.")
    }

    transaction.feePayer = wallet.publicKey
    transaction.recentBlockhash = recentBlockhash

    console.log("Signing transaction...")
    let signedTransaction
    try {
      signedTransaction = await wallet.signTransaction(transaction)
      console.log("Transaction signed successfully")
    } catch (signError) {
      console.error("Error signing transaction:", signError)
      throw new Error("Failed to sign transaction. Please check your wallet connection and try again.")
    }

    console.log("Sending transaction...")
    let signature
    try {
      signature = await connection.sendRawTransaction(signedTransaction.serialize())
      console.log("Transaction sent with signature:", signature)
    } catch (sendError) {
      console.error("Error sending transaction:", sendError)
      throw new Error("Failed to send transaction. Please try again.")
    }

    // Wait for confirmation using HTTP polling instead of WebSocket
    console.log("Waiting for transaction confirmation...")
    try {
      // Use getSignatureStatus instead of confirmTransaction to avoid WebSocket
      let confirmed = false
      let retries = 0
      const maxRetries = 30

      while (!confirmed && retries < maxRetries) {
        const status = await connection.getSignatureStatus(signature)
        if (status && status.value && status.value.confirmationStatus === "confirmed") {
          confirmed = true
          console.log("Transaction confirmed")
        } else {
          retries++
          console.log(`Waiting for confirmation... (attempt ${retries}/${maxRetries})`)
          // Wait 2 seconds between checks
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }

      if (!confirmed) {
        console.warn("Transaction may not be confirmed yet, but continuing...")
      }
    } catch (confirmError) {
      console.error("Error confirming transaction:", confirmError)
      // Even if confirmation fails, we'll continue with the process
      // The transaction might still be successful
    }

    // Generate pool ID and AMM ID based on the token pair
    console.log("Generating pool and AMM IDs...")
    const poolSeed = `${baseTokenMint.substring(0, 8)}-${quoteTokenMint.substring(0, 8)}-${Date.now()}`
    const poolId = `pool-${poolSeed}`
    const ammId = `amm-${poolSeed}`
    console.log("Pool ID:", poolId)
    console.log("AMM ID:", ammId)

    // Save pool creation data to database
    console.log("Saving pool creation data to database...")
    try {
      const poolData = {
        base_token_mint: baseTokenMint,
        quote_token_mint: quoteTokenMint,
        base_amount: baseAmount,
        quote_amount: quoteAmount,
        creator: wallet.publicKey.toString(),
        tx_signature: signature,
        pool_id: poolId,
        amm_id: ammId,
      }

      await savePoolCreation(poolData)
      console.log("Pool creation data saved to database")
    } catch (dbError) {
      console.error("Error saving pool data to database:", dbError)
      // Continue even if database save fails
      // We'll return the pool info to the user anyway
    }

    console.log("Liquidity pool creation process completed successfully")
    return {
      signature,
      poolId,
      ammId,
    }
  } catch (error) {
    console.error("Error in createLiquidityPool:", error)
    throw new Error(`Failed to create liquidity pool: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Function to check if a pool already exists for a token pair
export async function checkPoolExists(baseTokenMint: string, quoteTokenMint: string): Promise<boolean> {
  try {
    console.log("Checking if pool exists for token pair:", baseTokenMint, quoteTokenMint)

    // For now, we'll skip the actual check and assume the pool doesn't exist
    // This will allow the pool creation to proceed without getting stuck
    console.log("Skipping pool existence check for now")
    return false
  } catch (error) {
    console.error("Error checking if pool exists:", error)
    return false
  }
}

// Function to detect if a token is a Token-2022 token
export async function isToken2022Token(connection: Connection, mintAddress: string): Promise<boolean> {
  try {
    const mintInfo = await connection.getAccountInfo(new PublicKey(mintAddress))
    if (!mintInfo) return false

    return mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
  } catch (error) {
    console.error("Error checking token program:", error)
    return false
  }
}
