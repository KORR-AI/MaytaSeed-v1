"use server"

import { revalidatePath } from "next/cache"
import { getPoolsByCreator, savePoolCreation, type PoolRecord } from "@/lib/db"

export async function fetchUserPools(walletAddress: string): Promise<PoolRecord[]> {
  try {
    const pools = await getPoolsByCreator(walletAddress)
    return pools
  } catch (error) {
    console.error("Error fetching user pools:", error)
    throw new Error("Failed to fetch user pools")
  }
}

export async function createPoolRecord(poolData: Omit<PoolRecord, "id" | "created_at">): Promise<PoolRecord> {
  try {
    const newPool = await savePoolCreation(poolData)
    revalidatePath("/")
    return newPool
  } catch (error) {
    console.error("Error creating pool record:", error)
    throw new Error("Failed to create pool record")
  }
}
