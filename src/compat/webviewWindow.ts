import { bridge } from "./bridge"

export type UnlistenFn = () => void

export interface Event<T> {
  event: string
  id: number
  payload: T
}

/**
 * Mirrors @tauri-apps/api/webviewWindow#getCurrentWebviewWindow for the
 * broadcast-output windows. The label is assigned by the main process when
 * it creates the window ("broadcast-<outputId>").
 */
export function getCurrentWebviewWindow(): CurrentWebviewWindow {
  const b = bridge()
  let label = ""
  try {
    label = b.windowLabel()
  } catch {
    label = "main"
  }

  return {
    label,
    listen<T>(event: string, handler: (e: Event<T>) => void) {
      // Lazy import avoids a cycle at module-eval time; the compat event
      // module shares the same global listener channel.
      return import("./event").then(({ listen }) =>
        listen<T>(event, (e) => handler(e))
      )
    },
    async emitTo(target: string, event: string, payload?: unknown): Promise<void> {
      await b.emitTo(target, event, payload)
    },
  }
}

export interface CurrentWebviewWindow {
  label: string
  listen<T>(event: string, handler: (e: Event<T>) => void): Promise<UnlistenFn>
  emitTo(target: string, event: string, payload?: unknown): Promise<void>
}
