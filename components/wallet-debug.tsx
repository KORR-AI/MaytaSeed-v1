"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function WalletDebug() {
  const { wallet, publicKey, connected, connecting, disconnect, connect } = useWallet()
  const [isVisible, setIsVisible] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString().substring(11, 19)}: ${message}`])
  }

  useEffect(() => {
    if (connecting) {
      addLog(`Connecting to ${wallet?.adapter.name || "wallet"}...`)
    }
    if (connected) {
      addLog(`Connected to ${wallet?.adapter.name || "wallet"} - ${publicKey?.toString() || "unknown"}`)
    }
  }, [connecting, connected, wallet, publicKey])

  const handleReconnect = async () => {
    try {
      addLog("Attempting to disconnect...")
      await disconnect()
      addLog("Disconnected. Waiting to reconnect...")

      setTimeout(async () => {
        try {
          addLog("Attempting to connect...")
          await connect()
          addLog("Connect called")
        } catch (err) {
          addLog(`Connect error: ${err instanceof Error ? err.message : String(err)}`)
        }
      }, 1000)
    } catch (err) {
      addLog(`Disconnect error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 opacity-50 hover:opacity-100"
        onClick={() => setIsVisible(true)}
      >
        Debug
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto shadow-lg">
      <CardHeader className="py-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm">Wallet Debug</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-2">
          <div className="text-xs">
            <p>
              <strong>Status:</strong> {connecting ? "Connecting" : connected ? "Connected" : "Disconnected"}
            </p>
            <p>
              <strong>Wallet:</strong> {wallet?.adapter.name || "None"}
            </p>
            <p>
              <strong>Public Key:</strong> {publicKey?.toString() || "None"}
            </p>
          </div>

          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={handleReconnect}>
              Reconnect
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLogs([])}>
              Clear Logs
            </Button>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs font-mono h-32 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet</p>
            ) : (
              logs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
