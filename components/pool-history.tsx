"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { shortenAddress } from "@/lib/utils"
import { fetchUserPools } from "@/app/actions"
import type { PoolRecord } from "@/lib/db"

// SOL token address
const SOL_ADDRESS = "So11111111111111111111111111111111111111112"

export function PoolHistory() {
  const { connected, publicKey } = useWallet()
  const [pools, setPools] = useState<PoolRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadPools() {
      if (connected && publicKey) {
        try {
          setLoading(true)
          const userPools = await fetchUserPools(publicKey.toString())
          setPools(userPools)
        } catch (error) {
          console.error("Error loading pools:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadPools()
  }, [connected, publicKey])

  if (!connected) {
    return null
  }

  return (
    <Card className="w-full mt-8">
      <CardHeader>
        <CardTitle>Your SOL Liquidity Pools</CardTitle>
        <CardDescription>History of SOL liquidity pools you've created</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : pools.length === 0 ? (
          <p className="text-center py-8 text-gray-500">You haven't created any SOL liquidity pools yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>SOL Amount</TableHead>
                <TableHead>Token Amount</TableHead>
                <TableHead>Pool/AMM ID</TableHead>
                <TableHead>Transaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pools.map((pool) => {
                // Determine which token is SOL and which is the other token
                const isSolBase = pool.base_token_mint === SOL_ADDRESS
                const tokenAddress = isSolBase ? pool.quote_token_mint : pool.base_token_mint
                const solAmount = isSolBase ? pool.base_amount : pool.quote_amount
                const tokenAmount = isSolBase ? pool.quote_amount : pool.base_amount

                return (
                  <TableRow key={pool.id}>
                    <TableCell>{new Date(pool.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <a
                        href={`https://solscan.io/token/${tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {shortenAddress(tokenAddress)}
                      </a>
                    </TableCell>
                    <TableCell>{Number(solAmount).toFixed(4)} SOL</TableCell>
                    <TableCell>{Number(tokenAmount).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {pool.amm_id ? (
                        <a
                          href={`https://solscan.io/account/${pool.amm_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                          title={`Pool ID: ${pool.pool_id || "N/A"}`}
                        >
                          {shortenAddress(pool.amm_id)}
                        </a>
                      ) : pool.pool_id ? (
                        <a
                          href={`https://solscan.io/account/${pool.pool_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {shortenAddress(pool.pool_id)}
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://solscan.io/tx/${pool.tx_signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                      >
                        View
                      </a>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
