// Primary RPC endpoint (Alchemy)
export const PRIMARY_RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/5hFqSwkAoE9n4n0cb733mEY9qhwyvGJj"

// Fallback RPC endpoints
export const FALLBACK_RPC_URLS = [
  "https://api.mainnet-beta.solana.com", // Solana public RPC
  "https://solana-api.projectserum.com", // Project Serum RPC
  "https://rpc.ankr.com/solana", // Ankr RPC
]

// Get a random RPC URL from the fallback list
export function getFallbackRpcUrl(): string {
  const index = Math.floor(Math.random() * FALLBACK_RPC_URLS.length)
  return FALLBACK_RPC_URLS[index]
}
