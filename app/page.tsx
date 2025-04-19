import { LiquidityPoolCreator } from "@/components/liquidity-pool-creator"
import { PoolHistory } from "@/components/pool-history"
import { GuideSection } from "@/components/guide-section"

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Raydium SOL Liquidity Pool Creator</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Create and seed SOL liquidity pools for any Solana token
        </p>
        <LiquidityPoolCreator />
        <PoolHistory />
        <GuideSection />
      </div>
    </main>
  )
}
