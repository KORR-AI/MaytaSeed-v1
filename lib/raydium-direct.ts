import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token"
import type { WalletAdapter } from "./wallet"
import type { HttpOnlyConnection } from "./http-only-connection"

// Raydium Program IDs - kept for future implementation
export const RAYDIUM_LIQUIDITY_PROGRAM_ID = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8")

// SOL token address
export const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112")

// Function to create a simple test transaction instead of a Raydium pool
export async function createRaydiumPool({
  connection,
  wallet,
  baseMint,
  quoteMint,
  baseAmount,
  quoteAmount,
  onProgress,
}: {
  connection: HttpOnlyConnection
  wallet: WalletAdapter
  baseMint: PublicKey
  quoteMint: PublicKey
  baseAmount: number
  quoteAmount: number
  onProgress?: (message: string) => void
}): Promise<{ signature: string; poolId: string; ammId: string }> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected")
  }

  const logProgress = (message: string) => {
    console.log(message)
    if (onProgress) onProgress(message)
  }

  logProgress("Starting test transaction...")

  try {
    // Create a simple transaction that transfers a tiny amount of SOL from the user to themselves
    // This is just to test wallet signing without any complex instructions
    const transaction = new Transaction()

    // Add a simple SOL transfer instruction (0.000001 SOL)
    // This is a minimal amount that won't affect the user's balance
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: wallet.publicKey, // Send to self
        lamports: 1000, // 0.000001 SOL
      }),
    )

    // Get the latest blockhash
    logProgress("Getting latest blockhash...")
    transaction.feePayer = wallet.publicKey

    try {
      // Get the latest blockhash with multiple retries
      let blockhash = null
      let retries = 3
      let lastError = null

      while (retries > 0 && !blockhash) {
        try {
          const result = await connection.getLatestBlockhash()
          blockhash = result.blockhash
          logProgress("Got blockhash: " + blockhash)
        } catch (error) {
          lastError = error
          logProgress(`Blockhash attempt failed, retries left: ${retries - 1}`)
          retries--
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      if (!blockhash) {
        throw new Error(
          "Failed to get blockhash after multiple attempts: " +
            (lastError instanceof Error ? lastError.message : String(lastError)),
        )
      }

      transaction.recentBlockhash = blockhash
    } catch (error) {
      logProgress("Error getting blockhash: " + (error instanceof Error ? error.message : String(error)))
      throw new Error("Failed to get latest blockhash: " + (error instanceof Error ? error.message : String(error)))
    }

    // Sign with the wallet - with retry mechanism
    logProgress("Requesting wallet signature...")
    let signedTransaction = null
    let signAttempts = 0
    const maxSignAttempts = 3

    while (signAttempts < maxSignAttempts && !signedTransaction) {
      try {
        signAttempts++
        logProgress(`Wallet signature attempt ${signAttempts}/${maxSignAttempts}...`)

        // Set a timeout for wallet signing
        const signPromise = wallet.signTransaction(transaction)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Wallet signature request timed out on attempt ${signAttempts}`)), 30000)
        })

        signedTransaction = await Promise.race([signPromise, timeoutPromise])
        logProgress("Transaction signed by wallet successfully")
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logProgress(`Error on signature attempt ${signAttempts}: ${errorMessage}`)

        if (signAttempts >= maxSignAttempts) {
          throw new Error(
            "Failed to sign transaction after multiple attempts. Please ensure your wallet is unlocked and responsive.",
          )
        }

        // Wait before retrying
        logProgress("Waiting 5 seconds before retrying wallet signature...")
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }

    if (!signedTransaction) {
      throw new Error("Failed to sign transaction after multiple attempts")
    }

    // Send the transaction
    logProgress("Sending transaction...")
    let signature
    try {
      signature = await connection.sendRawTransaction(signedTransaction.serialize())
      logProgress("Transaction sent: " + signature)
    } catch (error) {
      logProgress("Error sending transaction: " + (error instanceof Error ? error.message : String(error)))
      throw new Error("Failed to send transaction: " + (error instanceof Error ? error.message : String(error)))
    }

    // Wait for confirmation with timeout
    logProgress("Waiting for transaction confirmation...")
    try {
      // Set a timeout for confirmation
      const confirmationPromise = connection.confirmTransaction(signature, "confirmed")
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Transaction confirmation timeout")), 30000),
      )

      await Promise.race([confirmationPromise, timeoutPromise])
      logProgress("Transaction confirmed")
    } catch (error) {
      logProgress(
        "Error or timeout confirming transaction: " + (error instanceof Error ? error.message : String(error)),
      )
      logProgress("Transaction may still be processing. Check the signature on Solana Explorer: " + signature)
      // Don't throw here, return the signature and let the caller handle it
    }

    // Generate dummy IDs for testing
    const testPoolId = Keypair.generate().publicKey.toString()
    const testAmmId = Keypair.generate().publicKey.toString()

    return {
      signature,
      poolId: testPoolId,
      ammId: testAmmId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logProgress("Error in test transaction: " + errorMessage)
    throw new Error("Test transaction failed: " + errorMessage)
  }
}

// Function to check if a token is a Token-2022 token
export async function isToken2022Token(connection: HttpOnlyConnection, mintAddress: string): Promise<boolean> {
  try {
    const mintInfo = await connection.getAccountInfo(new PublicKey(mintAddress))
    if (!mintInfo) return false

    return new PublicKey(mintInfo.owner).equals(TOKEN_2022_PROGRAM_ID)
  } catch (error) {
    console.error("Error checking token program:", error)
    return false
  }
}
