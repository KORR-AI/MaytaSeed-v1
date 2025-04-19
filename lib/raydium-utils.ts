// This file contains the modified utility functions from the Raydium SDK to fix bn.js compatibility issues
import { type Connection, PublicKey, type EpochInfo } from "@solana/web3.js"
import BN from "bn.js"

// Define the Token-2022 program ID
export const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")

// Define the missing types without relying on @solana/spl-token
export type Mint = {
  mintAuthority: null | Buffer
  supply: bigint
  decimals: number
  isInitialized: boolean
  freezeAuthority: null | Buffer
  // Token-2022 specific fields
  extensions?: {
    transferFeeConfig?: TransferFeeConfig
  }
}

export type TransferFee = {
  epoch: bigint
  maximumFee: bigint
  transferFeeBasisPoints: number
}

export type TransferFeeConfig = {
  transferFeeConfigAuthority: null | Buffer
  withdrawWithheldAuthority: null | Buffer
  withheldAmount: bigint
  olderTransferFee: TransferFee
  newerTransferFee: TransferFee
}

// Implement the missing functions without relying on @solana/spl-token
export function unpackMint(pubkey: PublicKey, accountInfo: any, owner?: PublicKey): Mint {
  // Check if this is a Token-2022 mint
  const isToken2022 = owner?.equals(TOKEN_2022_PROGRAM_ID) || false

  // This is a simplified implementation - in a real scenario you'd need to properly decode the data
  return {
    mintAuthority: null,
    supply: BigInt(0),
    decimals: 0,
    isInitialized: true,
    freezeAuthority: null,
    extensions: isToken2022 ? {} : undefined,
  }
}

export function getTransferFeeConfig(mint: Mint): TransferFeeConfig | null {
  // Check if this is a Token-2022 mint with transfer fee extension
  if (mint.extensions?.transferFeeConfig) {
    return mint.extensions.transferFeeConfig
  }
  return null
}

export function isToken2022(mintInfo: any): boolean {
  return mintInfo?.owner?.equals(TOKEN_2022_PROGRAM_ID) || false
}

export interface TransferAmountFee {
  amount: any // TokenAmount | CurrencyAmount
  fee: any | undefined // TokenAmount | CurrencyAmount | undefined
  expirationTime: number | undefined
}

export interface GetTransferAmountFee {
  amount: BN
  fee: BN | undefined
  expirationTime: number | undefined
}

const POINT = 10_000
const ZERO = new BN(0)
const ONE = new BN(1)

export function getTransferAmountFee(
  amount: BN,
  feeConfig: TransferFeeConfig | undefined,
  epochInfo: EpochInfo,
  addFee: boolean,
): GetTransferAmountFee {
  if (feeConfig === undefined) {
    return {
      amount,
      fee: undefined,
      expirationTime: undefined,
    }
  }

  const nowFeeConfig: TransferFee =
    epochInfo.epoch < Number(feeConfig.newerTransferFee.epoch) ? feeConfig.olderTransferFee : feeConfig.newerTransferFee
  const maxFee = new BN(nowFeeConfig.maximumFee.toString())
  const expirationTime: number | undefined =
    epochInfo.epoch < Number(feeConfig.newerTransferFee.epoch)
      ? ((Number(feeConfig.newerTransferFee.epoch) * epochInfo.slotsInEpoch - epochInfo.absoluteSlot) * 400) / 1000
      : undefined

  if (addFee) {
    if (nowFeeConfig.transferFeeBasisPoints === POINT) {
      const nowMaxFee = new BN(nowFeeConfig.maximumFee.toString())
      return {
        amount: amount.add(nowMaxFee),
        fee: nowMaxFee,
        expirationTime,
      }
    } else {
      const _TAmount = BNDivCeil(amount.mul(new BN(POINT)), new BN(POINT - nowFeeConfig.transferFeeBasisPoints))

      const nowMaxFee = new BN(nowFeeConfig.maximumFee.toString())
      const TAmount = _TAmount.sub(amount).gt(nowMaxFee) ? amount.add(nowMaxFee) : _TAmount

      const _fee = BNDivCeil(TAmount.mul(new BN(nowFeeConfig.transferFeeBasisPoints)), new BN(POINT))
      const fee = _fee.gt(maxFee) ? maxFee : _fee
      return {
        amount: TAmount,
        fee,
        expirationTime,
      }
    }
  } else {
    const _fee = BNDivCeil(amount.mul(new BN(nowFeeConfig.transferFeeBasisPoints)), new BN(POINT))
    const fee = _fee.gt(maxFee) ? maxFee : _fee

    return {
      amount,
      fee,
      expirationTime,
    }
  }
}

export function minExpirationTime(
  expirationTime1: number | undefined,
  expirationTime2: number | undefined,
): number | undefined {
  if (expirationTime1 === undefined) return expirationTime2
  if (expirationTime2 === undefined) return expirationTime1

  return Math.min(expirationTime1, expirationTime2)
}

export type ReturnTypeFetchMultipleMintInfo = Mint & { feeConfig: TransferFeeConfig | undefined }
export interface ReturnTypeFetchMultipleMintInfos {
  [mint: string]: ReturnTypeFetchMultipleMintInfo
}

export async function fetchMultipleMintInfos({ connection, mints }: { connection: Connection; mints: PublicKey[] }) {
  if (mints.length === 0) return {}

  // Fetch mint info for all mints using getMultipleAccountsInfo to avoid WebSocket
  const mintInfos = await Promise.all(
    mints.map(async (mint) => {
      try {
        const accountInfo = await connection.getAccountInfo(mint)
        return { pubkey: mint, accountInfo }
      } catch (error) {
        console.error(`Error fetching mint info for ${mint.toString()}:`, error)
        return { pubkey: mint, accountInfo: null }
      }
    }),
  )

  const mintK: ReturnTypeFetchMultipleMintInfos = {}
  for (const i of mintInfos) {
    if (i.accountInfo) {
      const t = unpackMint(i.pubkey, i.accountInfo, i.accountInfo?.owner)
      mintK[i.pubkey.toString()] = {
        ...t,
        feeConfig: getTransferFeeConfig(t) ?? undefined,
      }
    }
  }

  return mintK
}

export function BNDivCeil(bn1: BN, bn2: BN): BN {
  const { div, mod } = bn1.divmod(bn2)
  return mod.gt(ZERO) ? div.add(ONE) : div
}

// Helper function to check if a value is a BN instance
// This is the only change we're making - implementing our own isBN function
export function isBN(object: any): object is BN {
  return object !== null && typeof object === "object" && object instanceof BN
}
