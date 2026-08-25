type Level = "info" | "warn" | "error" | "debug" | "trace"

function forward(level: Level): (message: string) => Promise<void> {
  return async (message: string) => {
    try {
      const { bridge } = await import("./bridge")
      // The bridge exposes logging through invoke so it works even before
      // other channels are ready.
      await bridge().invoke("__log", { level, message })
    } catch {
      // Nowhere to send logs (plain browser dev) — drop silently.
    }
  }
}

export const info = forward("info")
export const warn = forward("warn")
export const error = forward("error")
export const debug = forward("debug")
export const trace = forward("trace")

/** No-op stand-in for plugin-log's attachConsole. */
export async function attachConsole(): Promise<() => void> {
  return () => {}
}
