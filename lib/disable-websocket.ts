// This file disables WebSockets globally to prevent any WebSocket connections

// Only run in browser environment
if (typeof window !== "undefined") {
  console.log("Disabling WebSockets globally...")

  try {
    // Store the original WebSocket constructor
    const OriginalWebSocket = window.WebSocket

    // Create a dummy WebSocket that logs when used
    class DisabledWebSocket extends OriginalWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        console.warn("WebSocket connection attempted:", url)

        // Create a dummy WebSocket that will immediately close
        super("wss://localhost:1234")

        // Immediately close it to prevent any actual connection
        setTimeout(() => {
          if (this.readyState === this.CONNECTING) {
            // Force the connection to appear closed
            Object.defineProperty(this, "readyState", { value: this.CLOSED })

            // Dispatch a close event
            const closeEvent = new CloseEvent("close", {
              wasClean: false,
              code: 1006,
              reason: "WebSocket disabled",
            })
            this.dispatchEvent(closeEvent)
          }
        }, 0)
      }

      // Override send to do nothing
      send() {
        console.warn("WebSocket send attempted but WebSockets are disabled")
        return
      }
    }

    // Replace the global WebSocket constructor
    window.WebSocket = DisabledWebSocket as any

    console.log("WebSockets successfully disabled")
  } catch (error) {
    console.error("Failed to disable WebSockets:", error)
  }
}

export {}
