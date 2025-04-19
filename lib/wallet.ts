// This file now just defines types, not using hooks directly
import type { PublicKey, Transaction } from "@solana/web3.js"

export interface WalletContextState {
  publicKey: PublicKey | null
  signTransaction?: (transaction: Transaction) => Promise<Transaction>
  signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>
}

export interface WalletAdapter {
  publicKey: PublicKey
  signTransaction: (transaction: Transaction) => Promise<Transaction>
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>
}
