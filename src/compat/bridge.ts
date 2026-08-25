/**
 * Access to the Electron preload bridge (`window.aleph`).
 *
 * Every `src/compat/*` module funnels through here. When the app runs in a
 * plain browser (vite dev without Electron), `window.aleph` is undefined and
 * callers see a rejected promise — matching how the Tauri APIs behaved
 * outside the webview, which the frontend already defends against.
 */
export interface AlephBridge {
  invoke(command: string, args?: Record<string, unknown>): Promise<unknown>
  emit(event: string, payload: unknown): void
  emitTo(label: string, event: string, payload: unknown): Promise<void>
  addEventListener(handler: (event: string, payload: unknown) => void): () => void
  windowLabel(): string
}

export function bridge(): AlephBridge {
  const b = (globalThis as Record<string, unknown>).aleph as AlephBridge | undefined
  if (!b) {
    throw new Error("Aleph bridge unavailable (running outside Electron?)")
  }
  return b
}
