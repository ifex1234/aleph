import { BrowserWindow, screen, type Display } from "electron"
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

function mainWindow(): BrowserWindow | null {
  return (
    BrowserWindow.getAllWindows().find(
      (w) => (w as BrowserWindow & { __alephLabel?: string }).__alephLabel === "main"
    ) ?? null
  )
}

/** The operator window when it sits on the same display as `display`, else null. */
function operatorOnDisplay(display: Display): BrowserWindow | null {
  const mainWin = mainWindow()
  if (!mainWin) return null
  const mainDisplay = screen.getDisplayMatching(mainWin.getBounds())
  return mainDisplay.id === display.id ? mainWin : null
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
): Promise<{ pinnedOperator: boolean }> {
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
  //
  // Flicker notes: the window is positioned and fullscreened *while still
  // hidden*, then shown without activation. showInactive + moveTop avoids
  // stealing keyboard focus from the operator window (a visible flash), and
  // a hidden window means Windows only composites the desktop once.
  win.setSkipTaskbar(false)
  win.setMinimizable(false)
  win.setBounds(display.bounds, false)
  win.setFullScreen(true)
  win.showInactive()
  win.moveTop()

  // Windows sometimes ignores setFullScreen on a hidden window, then shows it
  // as a normal framed 1920x1080 window. Re-assert fullscreen once visible.
  if (!win.isFullScreen()) {
    warn(`[broadcast] fullscreen was not applied while hidden, re-asserting`)
    win.setFullScreen(true)
  }

  // If the projector covers the display the operator window lives on, pin the
  // operator on top so the user stays in control. It can be minimized at will
  // to watch the output fullscreen; closing the output unpins it.
  const operator = operatorOnDisplay(display)
  if (operator) {
    operator.setAlwaysOnTop(true, "floating")
    info("[broadcast] pinned operator window (projector covers its display)")
  }

  emitAll("__window_list_changed", null)
  info(`[broadcast] opened projector '${outputId}' on monitor ${monitorIndex}`)
  return { pinnedOperator: !!operator }
}

export function closeBroadcastWindow(outputId: string): void {
  const win = getBroadcastWindow(outputId)
  if (!win) return
  // Always keep the window alive by hiding it. Destroying on every toggle
  // forced a full recreate + page reload on the next open — a visible flash —
  // while hiding makes re-opening instant with its content already rendered,
  // and keeps the NDI frame pump alive without special-casing isNdiActive.
  win.hide()
  win.setFullScreen(false)
  win.setSkipTaskbar(true)

  // Unpin the operator window once no live projector covers its display.
  const mainWin = mainWindow()
  if (mainWin?.isAlwaysOnTop()) {
    const mainDisplay = screen.getDisplayMatching(mainWin.getBounds())
    const stillCovered = BrowserWindow.getAllWindows().some((w) => {
      const label = (w as BrowserWindow & { __alephLabel?: string }).__alephLabel
      if (!label || !label.startsWith("broadcast-")) return false
      if (!w.isVisible()) return false
      return screen.getDisplayMatching(w.getBounds()).id === mainDisplay.id
    })
    if (!stillCovered) {
      mainWin.setAlwaysOnTop(false)
      info("[broadcast] unpinned operator window")
    }
  }

  emitAll("__window_list_changed", null)
  info(`[broadcast] hid window '${outputId}'`)
}

export interface MonitorSize {
  width: number
  height: number
}

/** Same shape as the Tauri `Monitor` type the renderer was written against. */
export interface MonitorInfo {
  name: string | null
  size: MonitorSize
  position: { x: number; y: number }
  workArea: { x: number; y: number; width: number; height: number }
  scale_factor: number
}

export function listMonitors(): MonitorInfo[] {
  try {
    // Mark the display the operator window currently sits on, so users don't
    // target their own screen ("Display 1" is not obviously the app screen).
    const mainWin = mainWindow()
    const operatorDisplayId = mainWin
      ? screen.getDisplayMatching(mainWin.getBounds()).id
      : null

    return screen.getAllDisplays().map((d, i) => {
      let name =
        d.label && d.label.length > 0
          ? d.label.replace(/^\\\\\.\\DISPLAY/, "Display ")
          : `Display ${i + 1}`
      if (operatorDisplayId === d.id) name += " (Aleph screen)"
      return {
        name,
        size: { width: d.size.width, height: d.size.height },
        position: { x: d.bounds.x, y: d.bounds.y },
        workArea: {
          x: d.workArea.x,
          y: d.workArea.y,
          width: d.workArea.width,
          height: d.workArea.height,
        },
        scale_factor: d.scaleFactor,
      }
    })
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
