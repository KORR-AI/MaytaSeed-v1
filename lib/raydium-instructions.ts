import { PublicKey, TransactionInstruction } from "@solana/web3.js"
import type { BN } from "./bn-compat"

// Raydium Program ID
export const RAYDIUM_LIQUIDITY_PROGRAM_ID = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8")

// Instruction types
export enum RaydiumInstructionType {
  Initialize = 0,
  CreatePool = 1,
  AddLiquidity = 2,
  RemoveLiquidity = 3,
  Swap = 4,
}

/**
 * Create a Raydium initialize instruction
 */
export function createInitializeInstruction(
  programId: PublicKey,
  keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>,
  nonce = 0,
): TransactionInstruction {
  const dataLayout = Buffer.alloc(8)
  dataLayout.writeUInt8(RaydiumInstructionType.Initialize, 0)
  dataLayout.writeUInt8(nonce, 1)

  return new TransactionInstruction({
    keys,
    programId,
    data: dataLayout,
  })
}

/**
 * Create a Raydium create pool instruction
 */
export function createPoolInstruction(
  programId: PublicKey,
  keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>,
  baseAmount: BN,
  quoteAmount: BN,
): TransactionInstruction {
  // Allocate buffer for instruction data
  const dataLayout = Buffer.alloc(40)

  // Write instruction type
  dataLayout.writeUInt8(RaydiumInstructionType.CreatePool, 0)

  // Write base amount (8 bytes)
  const baseAmountBuffer = Buffer.alloc(8)
  baseAmountBuffer.writeBigUInt64LE(BigInt(baseAmount.toString()), 0)
  baseAmountBuffer.copy(dataLayout, 8)

  // Write quote amount (8 bytes)
  const quoteAmountBuffer = Buffer.alloc(8)
  quoteAmountBuffer.writeBigUInt64LE(BigInt(quoteAmount.toString()), 0)
  quoteAmountBuffer.copy(dataLayout, 16)

  return new TransactionInstruction({
    keys,
    programId,
    data: dataLayout,
  })
}
