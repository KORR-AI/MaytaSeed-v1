import { Connection, type ConnectionConfig, type Commitment } from "@solana/web3.js"

/**
 * Creates a Connection instance without the problematic httpMethod parameter
 */
export function createSafeConnection(endpoint: string, commitmentOrConfig?: Commitment | ConnectionConfig): Connection {
  // Filter out httpMethod if it exists in the config
  if (typeof commitmentOrConfig === "object" && commitmentOrConfig !== null) {
    // Create a new object without the httpMethod property
    const { httpMethod, ...safeConfig } = commitmentOrConfig as any
    return new Connection(endpoint, safeConfig)
  }

  // If it's just a commitment string or undefined, pass it through
  return new Connection(endpoint, commitmentOrConfig)
}

/**
 * Safely creates a connection config object without httpMethod
 */
export function createSafeConnectionConfig(config: ConnectionConfig): ConnectionConfig {
  // Create a new object without the httpMethod property
  const { httpMethod, ...safeConfig } = config as any
  return safeConfig
}

// Browser-safe monkey patching - only execute in environments where Connection exists
if (typeof Connection !== "undefined") {
  try {
    const OriginalConnection = Connection

    // Create a safe wrapper function
    function SafeConnection(endpoint: string, commitmentOrConfig?: Commitment | ConnectionConfig) {
      // Filter out httpMethod if it exists
      if (typeof commitmentOrConfig === "object" && commitmentOrConfig !== null) {
        const { httpMethod, ...safeConfig } = commitmentOrConfig as any
        return new OriginalConnection(endpoint, safeConfig)
      }

      return new OriginalConnection(endpoint, commitmentOrConfig)
    }

    // Copy prototype and static properties
    SafeConnection.prototype = OriginalConnection.prototype
    Object.setPrototypeOf(SafeConnection, OriginalConnection)

    // Replace the Connection constructor in the current scope
    // This is safer than trying to modify global objects
    // @ts-ignore - Override the Connection constructor
    Connection = SafeConnection
  } catch (error) {
    console.warn("Failed to patch Connection class:", error)
  }
}
