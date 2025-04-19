import { type Connection, PublicKey } from "@solana/web3.js"
import { getMint } from "@solana/spl-token"

// Define the Token-2022 program ID
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
export const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")

export interface TokenInfo {
  address: PublicKey
  decimals: number
  isToken2022: boolean
}

export async function getTokenInfo(connection: Connection, mintAddress: PublicKey): Promise<TokenInfo> {
  try {
    // First, check if it's a Token-2022 token
    const accountInfo = await connection.getAccountInfo(mintAddress)
    const isToken2022 = accountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false

    // Get the mint info using the appropriate program ID
    const mintInfo = await getMint(
      connection,
      mintAddress,
      "confirmed",
      isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
    )

    return {
      address: mintAddress,
      decimals: mintInfo.decimals,
      isToken2022,
    }
  } catch (error) {
    console.error("Error getting token info:", error)
    throw new Error(`Failed to get token info: ${error instanceof Error ? error.message : String(error)}`)
  }
}

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
