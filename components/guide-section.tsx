import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function GuideSection() {
  return (
    <Card className="w-full mt-8">
      <CardHeader>
        <CardTitle>How to Create a SOL Liquidity Pool</CardTitle>
        <CardDescription>Follow these steps to create and seed a SOL liquidity pool on Raydium</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Step 1: Prepare Your Tokens</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">Before creating a liquidity pool, you need to have both tokens in your wallet:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>SOL (native Solana token)</li>
                <li>Your token that you want to pair with SOL</li>
              </ul>
              <p className="mt-2">Make sure you have enough tokens to seed the pool with sufficient liquidity.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>Step 2: Find Your Token Mint Address</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">You'll need the mint address for your token:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the "Browse Tokens" button to select common tokens</li>
                <li>For custom tokens, you can find the mint address on Solscan or in your wallet</li>
              </ul>
              <p className="mt-2">SOL address is automatically set as the base token:</p>
              <p className="text-xs font-mono mt-1">So11111111111111111111111111111111111111112</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>Step 3: Determine Initial Liquidity</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">The amounts you provide will determine the initial price of your token:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Price = SOL Amount ÷ Token Amount</li>
                <li>Example: 10 SOL and 1000 YOUR_TOKEN sets a price of 0.01 SOL per token</li>
              </ul>
              <p className="mt-2">Consider providing enough liquidity to minimize price impact for traders.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>Step 4: Create the Pool</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">After filling in all fields:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Click "Create SOL Liquidity Pool"</li>
                <li>Approve the transaction in your wallet</li>
                <li>Wait for the transaction to be confirmed</li>
              </ul>
              <p className="mt-2">
                Once confirmed, your SOL pool will be live on Raydium and traders can start using it.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger>After Creating the Pool</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">After your pool is created:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>You'll receive LP tokens representing your share of the pool</li>
                <li>You can earn fees from trades in your pool</li>
                <li>You can add more liquidity or remove it later through Raydium's interface</li>
              </ul>
              <p className="mt-2">
                Visit{" "}
                <a
                  href="https://raydium.io/liquidity/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  Raydium's Liquidity page
                </a>{" "}
                to manage your pool.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
