import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the entire app
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Function to refresh the schema cache
export async function refreshSchemaCache() {
  try {
    // This query forces Supabase to refresh its schema cache
    await supabase.rpc("pg_catalog_refresh")
    console.log("Schema cache refreshed successfully")
  } catch (error) {
    // If the RPC doesn't exist, we'll just log it and continue
    console.warn("Could not refresh schema cache:", error)
  }
}
