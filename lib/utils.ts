import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateSolanaAddress(address: string): boolean {
  // Basic validation: Solana addresses are 44 characters long (base58 encoded)
  return /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(address)
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return ""
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatAmount(amount: number | string): string {
  const num = typeof amount === "string" ? Number.parseFloat(amount) : amount
  if (isNaN(num)) return "0"

  if (num < 0.001) {
    return num.toExponential(4)
  }

  if (num < 1) {
    return num.toFixed(6)
  }

  if (num < 10000) {
    return num.toFixed(2)
  }

  return num.toLocaleString("en-US", { maximumFractionDigits: 2 })
}
