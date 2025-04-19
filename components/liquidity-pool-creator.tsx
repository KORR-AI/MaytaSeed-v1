"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { createLiquidityPool, checkPoolExists, isToken2022Token } from "@/lib/raydium"
import { validateSolanaAddress } from "@/lib/utils"
import { TokenLookup } from "./token-lookup"
import { Connection } from "@solana/web3.js"

// SOL token address
const SOL_ADDRESS = "So11111111111111111111111111111111111111112"

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

export function LiquidityPoolCreator() {
  const wallet = useWallet()
  const { connected, publicKey, signTransaction, signAllTransactions } = wallet
  const [baseTokenMint, setBaseTokenMint] = useState(SOL_ADDRESS)
  const [quoteTokenMint, setQuoteTokenMint] = useState("")
  const [baseAmount, setBaseAmount] = useState("")
  const [quoteAmount, setQuoteAmount] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)
  const [ammId, setAmmId] = useState<string | null>(null)
  const [poolId, setPoolId] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isBaseToken2022, setIsBaseToken2022] = useState(false)
  const [isQuoteToken2022, setIsQuoteToken2022] = useState(false)

  // Set SOL as the default base token
  useEffect(() => {
    setBaseTokenMint(SOL_ADDRESS)
  }, [])

  // Add this effect to check if tokens are Token-2022 tokens
  useEffect(() => {
    async function checkToken2022() {
      if (
        !baseTokenMint ||
        !quoteTokenMint ||
        !validateSolanaAddress(baseTokenMint) ||
        !validateSolanaAddress(quoteTokenMint)
      ) {
        return
      }

      try {
        // Use the connection with WebSocket disabled
        const connection = createConnection()

        // Use the new function from raydium.ts
        const baseIs2022 = await isToken2022Token(connection, baseTokenMint)
        const quoteIs2022 = await isToken2022Token(connection, quoteTokenMint)

        setIsBaseToken2022(baseIs2022)
        setIsQuoteToken2022(quoteIs2022)
      } catch (error) {
        console.error("Error checking Token-2022:", error)
      }
    }

    checkToken2022()
  }, [baseTokenMint, quoteTokenMint])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!baseTokenMint) {
      errors.baseTokenMint = "Base token mint address is required"
    } else if (!validateSolanaAddress(baseTokenMint)) {
      errors.baseTokenMint = "Invalid Solana address format"
    }

    if (!quoteTokenMint) {
      errors.quoteTokenMint = "Quote token mint address is required"
    } else if (!validateSolanaAddress(quoteTokenMint)) {
      errors.quoteTokenMint = "Invalid Solana address format"
    }

    if (baseTokenMint === quoteTokenMint) {
      errors.quoteTokenMint = "Base and quote tokens must be different"
    }

    if (!baseAmount) {
      errors.baseAmount = "Base amount is required"
    } else if (isNaN(Number(baseAmount)) || Number(baseAmount) <= 0) {
      errors.baseAmount = "Base amount must be a positive number"
    }

    if (!quoteAmount) {
      errors.quoteAmount = "Quote amount is required"
    } else if (isNaN(Number(quoteAmount)) || Number(quoteAmount) <= 0) {
      errors.quoteAmount = "Quote amount must be a positive number"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCheckPool = async () => {
    if (!validateForm()) {
      return
    }

    setIsChecking(true)
    setError(null)

    try {
      let poolExists = false
      try {
        poolExists = await checkPoolExists(baseTokenMint, quoteTokenMint)
      } catch (checkError) {
        console.error("Error checking pool:", checkError)
        // Continue with pool creation even if check fails
      }

      if (poolExists) {
        setError("A pool for this token pair already exists. Please use a different token pair.")
      }
    } catch (err) {
      console.error("Error in handleCheckPool:", err)
      // Don't set an error, allow the user to proceed
    } finally {
      setIsChecking(false)
    }
  }

  const handleCreatePool = async () => {
    console.log("Starting pool creation process...")

    if (!validateForm()) {
      console.log("Form validation failed")
      return
    }

    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError("Wallet not properly connected")
      console.log("Wallet not properly connected")
      return
    }

    setIsCreating(true)
    setError(null)
    setSuccess(null)
    setTxSignature(null)
    setAmmId(null)
    setPoolId(null)

    try {
      console.log("Creating wallet adapter...")
      // Create a wallet adapter object to pass to the function
      const walletAdapter = {
        publicKey,
        signTransaction,
        signAllTransactions,
      }

      console.log("Calling createLiquidityPool...")
      const result = await createLiquidityPool({
        wallet: walletAdapter,
        baseTokenMint,
        quoteTokenMint,
        baseAmount: Number.parseFloat(baseAmount),
        quoteAmount: Number.parseFloat(quoteAmount),
      })
      console.log("createLiquidityPool returned:", result)

      setTxSignature(result.signature)
      setAmmId(result.ammId)
      setPoolId(result.poolId)

      setSuccess("Liquidity pool created and seeded successfully!")
      console.log("Pool creation completed successfully")
    } catch (err) {
      console.error("Error creating liquidity pool:", err)
      setError(err instanceof Error ? err.message : "Failed to create liquidity pool")
    } finally {
      console.log("Setting isCreating to false")
      setIsCreating(false)
    }
  }

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, field: string, value: string) => {
    setter(value)
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors({
        ...validationErrors,
        [field]: "",
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create SOL Liquidity Pool</CardTitle>
        <CardDescription>Create and seed a new SOL liquidity pool on Raydium</CardDescription>
      </CardHeader>
      <CardContent>
        {!connected ? (
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
              Connect your wallet to create a liquidity pool
            </p>
            <WalletMultiButton className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg" />
          </div>
        ) : (
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="baseTokenMint">Base Token (SOL)</Label>
                      <TokenLookup
                        onSelect={(address) => setBaseTokenMint(address)}
                        isBaseToken={true}
                        buttonLabel="Select SOL"
                      />
                    </div>
                    <Input
                      id="baseTokenMint"
                      placeholder="SOL Token Address"
                      value={baseTokenMint}
                      onChange={(e) => handleInputChange(setBaseTokenMint, "baseTokenMint", e.target.value)}
                      className={validationErrors.baseTokenMint ? "border-red-500" : ""}
                      disabled={true}
                    />
                    {validationErrors.baseTokenMint && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.baseTokenMint}</p>
                    )}
                    {isBaseToken2022 && (
                      <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">This is a Token-2022 token</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="quoteTokenMint">Your Token Mint Address</Label>
                      <TokenLookup onSelect={(address) => setQuoteTokenMint(address)} buttonLabel="Browse Tokens" />
                    </div>
                    <Input
                      id="quoteTokenMint"
                      placeholder="Your token mint address"
                      value={quoteTokenMint}
                      onChange={(e) => handleInputChange(setQuoteTokenMint, "quoteTokenMint", e.target.value)}
                      className={validationErrors.quoteTokenMint ? "border-red-500" : ""}
                    />
                    {validationErrors.quoteTokenMint && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.quoteTokenMint}</p>
                    )}
                    {isQuoteToken2022 && (
                      <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">This is a Token-2022 token</div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckPool}
                      disabled={isChecking || !quoteTokenMint || !validateSolanaAddress(quoteTokenMint)}
                      className="mt-1"
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        "Check if pool exists"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseAmount">SOL Amount</Label>
                    <Input
                      id="baseAmount"
                      type="number"
                      placeholder="Amount of SOL to seed"
                      value={baseAmount}
                      onChange={(e) => handleInputChange(setBaseAmount, "baseAmount", e.target.value)}
                      className={validationErrors.baseAmount ? "border-red-500" : ""}
                    />
                    {validationErrors.baseAmount && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.baseAmount}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quoteAmount">Token Amount</Label>
                    <Input
                      id="quoteAmount"
                      type="number"
                      placeholder="Amount of your token to seed"
                      value={quoteAmount}
                      onChange={(e) => handleInputChange(setQuoteAmount, "quoteAmount", e.target.value)}
                      className={validationErrors.quoteAmount ? "border-red-500" : ""}
                    />
                    {validationErrors.quoteAmount && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.quoteAmount}</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced">
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Advanced settings will be available in a future update. For now, please use the basic settings.
                </p>
              </div>
            </TabsContent>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mt-4 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-400">Success</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {success}
                  {txSignature && (
                    <div className="mt-2">
                      <p className="text-sm">
                        Transaction ID:{" "}
                        <a
                          href={`https://solscan.io/tx/${txSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {txSignature.substring(0, 8)}...{txSignature.substring(txSignature.length - 8)}
                        </a>
                      </p>
                    </div>
                  )}
                  {poolId && (
                    <div className="mt-1">
                      <p className="text-sm">
                        Pool ID:{" "}
                        <span className="font-mono">
                          {poolId.substring(0, 8)}...{poolId.substring(poolId.length - 8)}
                        </span>
                      </p>
                    </div>
                  )}
                  {ammId && (
                    <div className="mt-1">
                      <p className="text-sm">
                        AMM ID:{" "}
                        <span className="font-mono">
                          {ammId.substring(0, 8)}...{ammId.substring(ammId.length - 8)}
                        </span>
                      </p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </Tabs>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleCreatePool} disabled={!connected || isCreating} className="w-full">
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating SOL Pool...
            </>
          ) : (
            "Create SOL Liquidity Pool"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
