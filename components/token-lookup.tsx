"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search } from "lucide-react"

const COMMON_TOKENS = [
  { symbol: "SOL", name: "Solana", address: "So11111111111111111111111111111111111111112" },
  { symbol: "RAY", name: "Raydium", address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R" },
  { symbol: "BONK", name: "Bonk", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "SAMO", name: "Samoyedcoin", address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" },
  { symbol: "ORCA", name: "Orca", address: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE" },
  { symbol: "MNGO", name: "Mango", address: "MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac" },
]

interface TokenLookupProps {
  onSelect: (address: string) => void
  buttonLabel?: string
  isBaseToken?: boolean
}

export function TokenLookup({ onSelect, buttonLabel = "Browse Tokens", isBaseToken = false }: TokenLookupProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // If it's a base token lookup, only show SOL
  const tokensToShow = isBaseToken ? COMMON_TOKENS.filter((token) => token.symbol === "SOL") : COMMON_TOKENS

  const filteredTokens = tokensToShow.filter(
    (token) =>
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.address.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSelect = (address: string) => {
    onSelect(address)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Search className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Token</DialogTitle>
          <DialogDescription>
            {isBaseToken
              ? "SOL is the base token for all pairs"
              : "Choose from common tokens or search by symbol, name, or address"}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {!isBaseToken && (
            <div className="mb-4">
              <Label htmlFor="token-search" className="sr-only">
                Search
              </Label>
              <Input
                id="token-search"
                placeholder="Search by symbol, name, or address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          )}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredTokens.length > 0 ? (
              <div className="space-y-2">
                {filteredTokens.map((token) => (
                  <div
                    key={token.address}
                    className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
                    onClick={() => handleSelect(token.address)}
                  >
                    <div>
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-sm text-gray-500">{token.name}</div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate max-w-[150px]">
                      {token.address.substring(0, 4)}...{token.address.substring(token.address.length - 4)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No tokens found</p>
            )}
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
