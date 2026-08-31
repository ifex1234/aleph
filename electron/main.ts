import { app, BrowserWindow, ipcMain, screen, session } from "electron"
import path from "node:path"
import { initLogger, info, warn } from "./services/logger"
import { emitAll, emitToWindow, windowsByLabel } from "./services/events"
import { flushStores } from "./services/stores"
import { handleInvoke } from "./ipc"
import { closeDb } from "./services/bible"
import { initRuntime } from "./services/detection-runtime"
import { initSemanticDownload } from "./services/semantic-download"
import { capture } from "./services/stt/session"
import { shutdownNdi } from "./services/ndi"
import { oscServer, httpServer } from "./ipc"

/**
 * Electron main process. Loads the Vite-built renderer (or the dev server),
 * wires the single IPC surface the frontend's compat shims use, and owns all
 * backend services (bible DB, STT, detection, broadcast windows, NDI,
 * remote control).
 */

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined

// Windows: app model id for notifications/taskbar grouping.
if (process.platform === "win32") {
  app.setAppUserModelId("com.zeravest.aleph")
}

// Keep GPU/media working inside screen-capture-like output windows.
app.commandLine.appendSwitch("disable-http-cache")

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: "Aleph",
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    center: true,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(app.getAppPath(), "build-resources", "icons", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  })
  ;(win as BrowserWindow & { __alephLabel?: string }).__alephLabel = "main"

  win.once("ready-to-show", () => win.show())
  win.on("closed", () => {
    // The main window closing quits (broadcast windows are torn down too).
    app.quit()
  })

  if (isDev) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL!)
  } else {
    void win.loadFile(path.join(__dirname, "..", "build", "index.html"))
  }
  return win
}

function registerIpc(): void {
  ipcMain.handle(
    "aleph:invoke",
    async (event, command: string, args: Record<string, unknown>) =>
      handleInvoke(command, args ?? {}, event.sender)
  )

  // Renderer-initiated event routing.
  ipcMain.on("aleph:emit", (_event, name: string, payload: unknown) => {
    emitAll(name, payload)
  })
  ipcMain.handle(
    "aleph:emit-to",
    (_event, label: string, name: string, payload: unknown) =>
      emitToWindow(label, name, payload)
  )

  // Each window learns its own label synchronously at startup.
  ipcMain.on("aleph:label", (event: Electron.IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    event.returnValue =
      (win as (BrowserWindow & { __alephLabel?: string }) | null)
        ?.__alephLabel ?? "main"
  })

  // Grant mic access to our own pages without prompting every launch.
  session.defaultSession.setPermissionRequestHandler(
    (_wc, permission, callback) => {
      callback(permission === "media")
    }
  )
}

// Single-instance lock so a second launch focuses the existing app.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("second-instance", () => {
    const main = windowsByLabel().get("main")
    if (main) {
      if (main.isMinimized()) main.restore()
      main.focus()
    }
  })

  app.whenReady().then(() => {
    try {
      initLogger()
    } catch (e) {
      console.error("logger init failed", e)
    }
    info(`[main] starting (dev=${isDev})`)

    registerIpc()
    initRuntime()
    // Fetch semantic-search assets on first run of packaged builds.
    initSemanticDownload()

    const main = createMainWindow()
    void main

    // Position on the primary display's work area center (Tauri centered).
    const { workArea } = screen.getPrimaryDisplay()
    main.setBounds(
      {
        x: Math.max(workArea.x + (workArea.width - 1280) / 2, workArea.x),
        y: Math.max(workArea.y + (workArea.height - 800) / 2, workArea.y),
        width: 1280,
        height: 800,
      },
      false
    )

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })
}

app.on("window-all-closed", () => {
  app.quit()
})

let quitting = false
app.on("before-quit", () => {
  if (quitting) return
  quitting = true
  try {
    shutdownNdi()
    void oscServer.stop()
    void httpServer.stop()
    capture.destroy()
    closeDb()
    flushStores()
  } catch (e) {
    warn("[main] cleanup error:", e)
  }
})

process.on("uncaughtException", (e) => {
  warn("[main] uncaught exception:", e)
})
process.on("unhandledRejection", (e) => {
  warn("[main] unhandled rejection:", e)
})
