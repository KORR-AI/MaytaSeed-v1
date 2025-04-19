"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2, Terminal, Info, ExternalLink } from "lucide-react"
import { createLiquidityPool, checkPoolExists, isToken2022Token } from "@/lib/raydium"
import { validateSolanaAddress } from "@/lib/utils"
import { TokenLookup } from "./token-lookup"
import { createHttpOnlyConnection } from "./http-only-connection"
import { PRIMARY_RPC_URL, getFallbackRpcUrl } from "@/lib/constants"

// SOL token address
const SOL_ADDRESS = "So11111111111111111111111111111111111111112"

export function LiquidityPoolCreator() {
  const wallet = useWallet()
  const { connected, publicKey, signTransaction, signAllTransactions, wallet: walletAdapter } = wallet
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
  const [progressMessages, setProgressMessages] = useState<string[]>([])
  const [showProgress, setShowProgress] = useState(false)
  const [rpcStatus, setRpcStatus] = useState<"checking" | "connected" | "error">("checking")
  const [waitingForWallet, setWaitingForWallet] = useState(false)
  const [walletName, setWalletName] = useState<string>("your wallet")
  const [testMode, setTestMode] = useState(true)

  // Timeout reference to cancel if component unmounts
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Flag to track if the component is mounted
  const isMountedRef = useRef(true)

  // Set SOL as the default base token and check RPC connection
  useEffect(() => {
    // Set the mounted flag
    isMountedRef.current = true

    setBaseTokenMint(SOL_ADDRESS)

    // Check RPC connection on load
    async function checkRpcConnection() {
      if (!isMountedRef.current) return

      setRpcStatus("checking")
      try {
        // Try primary RPC
        const connection = createHttpOnlyConnection(PRIMARY_RPC_URL)
        await connection.getLatestBlockhash()
        if (isMountedRef.current) setRpcStatus("connected")
      } catch (primaryError) {
        console.error("Primary RPC connection failed:", primaryError)

        try {
          // Try fallback RPC
          const fallbackUrl = getFallbackRpcUrl()
          const fallbackConnection = createHttpOnlyConnection(fallbackUrl)
          await fallbackConnection.getLatestBlockhash()
          if (isMountedRef.current) setRpcStatus("connected")
        } catch (fallbackError) {
          console.error("Fallback RPC connection failed:", fallbackError)
          if (isMountedRef.current) setRpcStatus("error")
        }
      }
    }

    checkRpcConnection()

    // Clear timeout and set mounted flag to false on unmount
    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  // Get wallet name when connected
  useEffect(() => {
    if (walletAdapter) {
      setWalletName(walletAdapter.adapter.name || "your wallet")
    }
  }, [walletAdapter])

  // Add this effect to check if tokens are Token-2022 tokens
  useEffect(() => {
    async function checkToken2022() {
      if (
        !isMountedRef.current ||
        !baseTokenMint ||
        !quoteTokenMint ||
        !validateSolanaAddress(baseTokenMint) ||
        !validateSolanaAddress(quoteTokenMint)
      ) {
        return
      }

      try {
        // Try primary RPC first, then fallback if needed
        let connection
        try {
          connection = createHttpOnlyConnection(PRIMARY_RPC_URL)
          await connection.getLatestBlockhash() // Test the connection
        } catch (error) {
          const fallbackUrl = getFallbackRpcUrl()
          connection = createHttpOnlyConnection(fallbackUrl)
        }

        // Use the new function from raydium.ts
        const baseIs2022 = await isToken2022Token(connection, baseTokenMint)
        const quoteIs2022 = await isToken2022Token(connection, quoteTokenMint)

        if (isMountedRef.current) {
          setIsBaseToken2022(baseIs2022)
          setIsQuoteToken2022(quoteIs2022)
        }
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
      if (isMountedRef.current) {
        setIsChecking(false)
      }
    }
  }

  const addProgressMessage = (message: string) => {
    if (isMountedRef.current) {
      setProgressMessages((prev) => [...prev, message])
    }
  }

  const handleCreatePool = async () => {
    console.log("Starting test transaction process...")

    if (!validateForm()) {
      console.log("Form validation failed")
      return
    }

    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError("Wallet not properly connected")
      console.log("Wallet not properly connected")
      return
    }

    // Check RPC status
    if (rpcStatus === "error") {
      setError("Cannot connect to Solana network. Please try again later.")
      return
    }

    // Reset state
    setIsCreating(true)
    setError(null)
    setSuccess(null)
    setTxSignature(null)
    setAmmId(null)
    setPoolId(null)
    setProgressMessages([])
    setShowProgress(true)
    setWaitingForWallet(false)

    // Add initial progress message
    addProgressMessage("Starting test transaction process...")

    // Set a timeout to prevent infinite spinner - longer timeout for better UX
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && isCreating) {
        setIsCreating(false)
        setError("Operation timed out after 3 minutes. Please check Solana Explorer for your transaction status.")
        addProgressMessage("Operation timed out after 3 minutes.")
      }
    }, 180000) // 3 minute timeout

    try {
      console.log("Creating wallet adapter...")
      addProgressMessage("Creating wallet adapter...")

      // Create a wallet adapter object to pass to the function
      const walletAdapter = {
        publicKey,
        signTransaction,
        signAllTransactions,
      }

      // Prepare the user for wallet interaction
      addProgressMessage(`Preparing transaction for ${walletName}...`)
      setWaitingForWallet(true)
      addProgressMessage(`Please check ${walletName} for approval request...`)

      // Add specific instructions for Phantom wallet
      if (walletName.toLowerCase().includes("phantom")) {
        addProgressMessage("If using Phantom, look for the notification icon in your browser toolbar")
      }

      // Use Promise.race to handle both the pool creation and a manual timeout
      const poolCreationPromise = createLiquidityPool({
        wallet: walletAdapter,
        baseTokenMint,
        quoteTokenMint,
        baseAmount: Number.parseFloat(baseAmount),
        quoteAmount: Number.parseFloat(quoteAmount),
        onProgress: (message) => {
          addProgressMessage(message)
          // When we detect the wallet has signed, update the UI
          if (message.includes("Transaction signed by wallet")) {
            setWaitingForWallet(false)
          }
        },
      })

      // Create a manual timeout promise - increased to 3 minutes
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Operation timed out after 3 minutes"))
        }, 180000) // 3 minute timeout
      })

      // Race the promises
      const result = await Promise.race([poolCreationPromise, timeoutPromise])

      console.log("Test transaction returned:", result)
      addProgressMessage("Test transaction completed successfully!")

      // Clear the timeout since we completed successfully
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (isMountedRef.current) {
        setTxSignature(result.signature)
        setAmmId(result.ammId)
        setPoolId(result.poolId)
        setSuccess("Test transaction completed successfully! Your wallet is working correctly.")
        console.log("Test transaction completed successfully")
        setWaitingForWallet(false)
      }
    } catch (err) {
      console.error("Error in test transaction:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to complete test transaction"

      // Check for specific error messages
      let userFriendlyError = errorMessage
      if (errorMessage.includes("InvalidInstructionData")) {
        userFriendlyError =
          "Transaction failed: Invalid instruction data. This is likely an issue with our test transaction."
      } else if (errorMessage.includes("blockhash")) {
        userFriendlyError =
          "Failed to get latest blockhash. The Solana network may be congested. Please try again later."
      } else if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        if (
          errorMessage.includes("Wallet signature request timed out") ||
          errorMessage.includes("Failed to sign transaction")
        ) {
          userFriendlyError = `Wallet signature request timed out. Please check ${walletName} for a pending approval notification and try again.`
        } else {
          userFriendlyError = "Operation timed out. The Solana network may be congested. Please try again later."
        }
      }

      if (isMountedRef.current) {
        setError(userFriendlyError)
        addProgressMessage("Error: " + userFriendlyError)
        setWaitingForWallet(false)
      }

      // Clear the timeout since we got an error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    } finally {
      console.log("Setting isCreating to false")
      // Always reset the creating state, even if there was an error
      if (isMountedRef.current) {
        setIsCreating(false)
        setWaitingForWallet(false)
      }
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

        {/* RPC Status Indicator */}
        {rpcStatus === "checking" && (
          <div className="text-sm text-amber-500 flex items-center mt-2">
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Checking connection to Solana...
          </div>
        )}
        {rpcStatus === "error" && (
          <div className="text-sm text-red-500 flex items-center mt-2">
            <AlertCircle className="h-3 w-3 mr-2" />
            Cannot connect to Solana network. Some features may not work.
          </div>
        )}
        {rpcStatus === "connected" && (
          <div className="text-sm text-green-500 flex items-center mt-2">
            <CheckCircle2 className="h-3 w-3 mr-2" />
            Connected to Solana network
          </div>
        )}
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
                {/* Test Mode Warning */}
                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-amber-800 dark:text-amber-400">Test Mode Active</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    This is currently in test mode. It will create a simple SOL transfer transaction to verify wallet
                    connectivity but won't create an actual pool yet.
                  </AlertDescription>
                </Alert>

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

            {/* Wallet Signature Alert */}
            {waitingForWallet && (
              <Alert className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-400">Waiting for {walletName} Approval</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  <p className="mb-2">
                    Please check {walletName} for a transaction approval request. If you don't see a notification, open
                    your wallet extension manually.
                  </p>
                  {walletName.toLowerCase().includes("phantom") && (
                    <div className="mt-2 text-sm">
                      <p className="font-medium">Phantom Wallet Tips:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Look for the Phantom icon in your browser toolbar</li>
                        <li>Check for a notification badge on the icon</li>
                        <li>If you don't see a request, try clicking the Phantom icon to open it</li>
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Progress Log */}
            {showProgress && progressMessages.length > 0 && (
              <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-md p-3">
                <div className="flex items-center mb-2">
                  <Terminal className="h-4 w-4 mr-2" />
                  <h4 className="text-sm font-medium">Progress Log</h4>
                </div>
                <div className="max-h-40 overflow-y-auto text-xs font-mono">
                  {progressMessages.map((message, index) => (
                    <div key={index} className="py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      {message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  <p>{error}</p>
                  {error.includes("Wallet signature request timed out") && (
                    <div className="mt-2 text-sm">
                      <p className="font-medium">Troubleshooting tips:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Make sure your wallet extension is unlocked</li>
                        <li>Check for pending approval notifications in your wallet</li>
                        <li>Try refreshing the page and trying again</li>
                        <li>If using Phantom, check the browser toolbar for the Phantom icon</li>
                      </ul>
                    </div>
                  )}
                </AlertDescription>
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
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                        >
                          {txSignature.substring(0, 8)}...{txSignature.substring(txSignature.length - 8)}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
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
        <Button
          onClick={handleCreatePool}
          disabled={!connected || isCreating || rpcStatus === "error" || rpcStatus === "checking"}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {waitingForWallet ? `Waiting for ${walletName} Approval...` : "Processing Transaction..."}
            </>
          ) : (
            "Test Wallet Connection"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
