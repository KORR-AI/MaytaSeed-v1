import { supabase, refreshSchemaCache } from "./supabase"

export interface PoolRecord {
  id: string
  base_token_mint: string
  quote_token_mint: string
  base_amount: number
  quote_amount: number
  creator: string
  created_at: string
  tx_signature: string
  pool_id?: string
  amm_id?: string
}

export async function savePoolCreation(poolData: Omit<PoolRecord, "id" | "created_at">): Promise<PoolRecord> {
  try {
    // Try to insert the data
    const { data, error } = await supabase.from("liquidity_pools").insert(poolData).select().single()

    if (error) {
      // If there's a schema cache error, try refreshing the cache and retry
      if (error.message.includes("schema cache") || error.message.includes("column")) {
        console.log("Schema cache error detected, attempting to refresh cache and retry...")
        await refreshSchemaCache()

        // Retry the insert after refreshing the cache
        const retryResult = await supabase.from("liquidity_pools").insert(poolData).select().single()

        if (retryResult.error) {
          console.error("Error saving pool data after cache refresh:", retryResult.error)
          throw new Error(`Failed to save pool data: ${retryResult.error.message}`)
        }

        return retryResult.data
      }

      // For other errors, just throw
      console.error("Error saving pool data:", error)
      throw new Error(`Failed to save pool data: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("Unexpected error in savePoolCreation:", error)
    throw error
  }
}

export async function getPoolsByCreator(creator: string): Promise<PoolRecord[]> {
  try {
    const { data, error } = await supabase
      .from("liquidity_pools")
      .select("*")
      .eq("creator", creator)
      .order("created_at", { ascending: false })

    if (error) {
      // If there's a schema cache error, try refreshing the cache and retry
      if (error.message.includes("schema cache") || error.message.includes("column")) {
        console.log("Schema cache error detected, attempting to refresh cache and retry...")
        await refreshSchemaCache()

        // Retry the query after refreshing the cache
        const retryResult = await supabase
          .from("liquidity_pools")
          .select("*")
          .eq("creator", creator)
          .order("created_at", { ascending: false })

        if (retryResult.error) {
          console.error("Error fetching pools after cache refresh:", retryResult.error)
          throw new Error(`Failed to fetch pools: ${retryResult.error.message}`)
        }

        return retryResult.data || []
      }

      // For other errors, just throw
      console.error("Error fetching pools:", error)
      throw new Error(`Failed to fetch pools: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error("Unexpected error in getPoolsByCreator:", error)
    throw error
  }
}
