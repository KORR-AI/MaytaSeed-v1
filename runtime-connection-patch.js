// This file patches the Connection class at runtime
// It will be imported at the top of layout.js

// Patch for browser environment
if (typeof window !== "undefined") {
  // Wait for the @solana/web3.js module to load
  const originalDefineProperty = Object.defineProperty

  Object.defineProperty = function (obj, prop, descriptor) {
    // Check if this is the Connection class being defined
    if (
      prop === "Connection" &&
      descriptor &&
      descriptor.value &&
      descriptor.value.toString().includes("function Connection")
    ) {
      // Store the original Connection constructor
      const OriginalConnection = descriptor.value

      // Create a safe wrapper
      const SafeConnection = (endpoint, commitmentOrConfig) => {
        // Filter out httpMethod if it exists
        if (typeof commitmentOrConfig === "object" && commitmentOrConfig !== null) {
          const { httpMethod, ...safeConfig } = commitmentOrConfig
          return new OriginalConnection(endpoint, safeConfig)
        }

        return new OriginalConnection(endpoint, commitmentOrConfig)
      }

      // Copy prototype and static properties
      SafeConnection.prototype = OriginalConnection.prototype
      Object.setPrototypeOf(SafeConnection, OriginalConnection)

      // Replace with our safe version
      descriptor.value = SafeConnection
    }

    return originalDefineProperty.call(this, obj, prop, descriptor)
  }
}

// Patch for Node.js environment - only execute if we're in Node.js
if (typeof process !== "undefined" && process.versions && process.versions.node) {
  try {
    // Try to load @solana/web3.js
    const solanaWeb3 = require("@solana/web3.js")

    if (solanaWeb3 && solanaWeb3.Connection) {
      // Store the original Connection constructor
      const OriginalConnection = solanaWeb3.Connection

      // Create a safe wrapper
      function SafeConnection(endpoint, commitmentOrConfig) {
        // Filter out httpMethod if it exists
        if (typeof commitmentOrConfig === "object" && commitmentOrConfig !== null) {
          const { httpMethod, ...safeConfig } = commitmentOrConfig
          return new OriginalConnection(endpoint, safeConfig)
        }

        return new OriginalConnection(endpoint, commitmentOrConfig)
      }

      // Copy prototype and static properties
      SafeConnection.prototype = OriginalConnection.prototype
      Object.setPrototypeOf(SafeConnection, OriginalConnection)

      // Replace the Connection constructor
      solanaWeb3.Connection = SafeConnection
    }
  } catch (error) {
    // Ignore errors, the module might not be loaded yet
  }
}
