import BN from "bn.js"

// This file provides compatibility functions for bn.js that are expected by Raydium SDK

/**
 * Check if an object is a BN.js instance
 * This replaces the missing isBN export from bn.js
 */
export function isBN(object: any): object is BN {
  return object !== null && typeof object === "object" && object instanceof BN
}

/**
 * Extend the BN prototype with additional methods expected by the SDK
 */
export function extendBN() {
  // Only add the methods if they don't already exist
  if (!(BN.prototype as any).toJSON) {
    // Add toJSON method to BN prototype for serialization
    ;(BN.prototype as any).toJSON = function () {
      return this.toString(10)
    }
  }
}

// Initialize the BN extensions
extendBN()

// Re-export BN with our extensions
export { BN }
