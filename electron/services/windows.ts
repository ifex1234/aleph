import { BrowserWindow, screen } from "electron"
import path from "node:path"
import { info, warn } from "./logger"
import { emitAll } from "./events"

/**
 * Broadcast output window management — the Electron equivalent of
 * src-tauri/src/commands/broadcast.rs. Windows are labelled
 * `broadcast-<outputId>` and load broadcast-output.html?output=<id>.
 */

const VALID_ID = /^[A-Za-z0-9_-]+$/

function devServerUrl(): string | null {
  return process.env.VITE_DEV_SERVER_URL ?? null
}

export function rendererUrl(entry: string, query = ""): string {
  const dev = devServerUrl()
  if (dev) {
    const base = dev.endsWith("/") ? dev.slice(0, -1) : dev
    return `${base}/${entry}${query}`
  }
  // Packaged: the Vite build emits both entries into build/.
  return `file://${path.join(__dirname, "..", "build", entry)}${query}`
}

function windowLabel(outputId: string): string {
  return `broadcast-${outputId}`
}

export function getBroadcastWindow(outputId: string): BrowserWindow | null {
  const label = windowLabel(outputId)
  for (const win of BrowserWindow.getAllWindows()) {
    if ((win as BrowserWindow & { __alephLabel?: string }).__alephLabel === label) {
      return win
    }
  }
  return null
}

export async function ensureBroadcastWindow(
  outputId: string,
  title?: string
): Promise<void> {
  if (!VALID_ID.test(outputId)) throw new Error("Invalid output id")
  const existing = getBroadcastWindow(outputId)
  if (existing) return

  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    skipTaskbar: true,
    focusable: false,
    title: title ?? "Aleph Broadcast",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })
  ;(win as BrowserWindow & { __alephLabel?: string }).__alephLabel =
    windowLabel(outputId)

  await win.loadURL(rendererUrl("broadcast-output.html", `?output=${outputId}`))
  win.once("ready-to-show", () => {
    emitAll("__window_list_changed", null)
  })
  win.on("closed", () => {
    emitAll("__window_list_changed", null)
  })
  info(`[broadcast] ensured window '${outputId}'`)
}

export async function openBroadcastWindow(
  outputId: string,
  monitorIndex: number,
  title?: string
): Promise<void> {
  await ensureBroadcastWindow(outputId, title)
  const win = getBroadcastWindow(outputId)
  if (!win) throw new Error("Failed to create broadcast window")

  const displays = screen.getAllDisplays()
  const display =
    displays[Math.min(Math.max(monitorIndex, 0), displays.length - 1)] ??
    screen.getPrimaryDisplay()

  // Position/size to exactly cover the target display. Electron bounds are
  // already in device-independent pixels consistent per display, so setting
  // bounds directly avoids the DPI rescaling bug the Rust code worked around.
  win.setSkipTaskbar(false)
  win.setBounds(display.bounds, false)
  win.setFullScreen(true)
  win.setMinimizable(false)
  win.show()
  win.focus()
  emitAll("__window_list_changed", null)
  info(`[broadcast] opened projector '${outputId}' on monitor ${monitorIndex}`)
}

export function closeBroadcastWindow(outputId: string): void {
  const win = getBroadcastWindow(outputId)
  if (!win) return
  const isNdiActive = ndiActiveChecker?.(outputId) ?? false
  if (isNdiActive) {
    // Keep the renderer alive so it can keep pumping NDI frames.
    win.hide()
    win.setFullScreen(false)
    win.setSkipTaskbar(true)
    info(`[broadcast] hid window '${outputId}' (NDI active)`)
  } else {
    win.destroy()
    info(`[broadcast] closed window '${outputId}'`)
  }
  emitAll("__window_list_changed", null)
}

let ndiActiveChecker: ((outputId: string) => boolean) | null = null

/** Called from ipc.ts after NDI service init so close() can consult it. */
export function setNdiActiveChecker(fn: (outputId: string) => boolean): void {
  ndiActiveChecker = fn
}

export interface MonitorInfo {
  name: string
  width: number
  height: number
}

export function listMonitors(): MonitorInfo[] {
  try {
    return screen.getAllDisplays().map((d, i) => ({
      name:
        d.label && d.label.length > 0
          ? d.label.replace(/^\\\\\.\\DISPLAY/, "Display ")
          : `Display ${i + 1}`,
      width: d.size.width,
      height: d.size.height,
    }))
  } catch (e) {
    warn("[broadcast] listMonitors failed:", e)
    return []
  }
}

export function allWindowStatuses(): Array<{ label: string; visible: boolean }> {
  return BrowserWindow.getAllWindows().map((w) => ({
    label:
      (w as BrowserWindow & { __alephLabel?: string }).__alephLabel ?? "main",
    visible: w.isVisible(),
  }))
}
