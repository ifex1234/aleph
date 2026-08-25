import { BrowserWindow } from "electron"

/**
 * The event bus. Mirrors Tauri's emit/emitTo semantics:
 * - `emitAll` fans an event out to every app window (backend → UI events)
 * - `emitToWindow` targets one window by label ("main" or "broadcast-<id>")
 * Renderer-initiated emits arrive via IPC and route through the same two
 * functions, so event names and payload shapes stay identical to before.
 */
export function windowsByLabel(): Map<string, BrowserWindow> {
  const map = new Map<string, BrowserWindow>()
  for (const win of BrowserWindow.getAllWindows()) {
    const label = (win as BrowserWindow & { __alephLabel?: string }).__alephLabel
    if (label) map.set(label, win)
  }
  return map
}

export function emitAll(event: string, payload?: unknown): void {
  const data = { event, payload: payload ?? null }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("aleph:event", data)
    }
  }
}

export function emitToWindow(label: string, event: string, payload?: unknown): boolean {
  const win = windowsByLabel().get(label)
  if (!win || win.isDestroyed()) return false
  win.webContents.send("aleph:event", { event, payload: payload ?? null })
  return true
}
