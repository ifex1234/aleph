import { app, dialog } from "electron"
import { autoUpdater } from "electron-updater"
import log from "electron-log"
import { info, warn } from "./logger"
import { windowsByLabel } from "./events"

/**
 * In-app updates via electron-updater + GitHub Releases (see the `publish`
 * section of electron-builder.yml).
 *
 * - No-ops entirely in dev (updates only make sense in packaged builds).
 * - Checks on startup (after a grace delay) and every 6 hours.
 * - Downloads in the background; when ready, prompts restart now / later.
 */

const STARTUP_CHECK_DELAY_MS = 15_000
const PERIODIC_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

let initialized = false

function mainWindow() {
  return (
    windowsByLabel().get("main") ?? undefined
  )
}

async function promptRestart(version: string): Promise<void> {
  const win = mainWindow()
  const options = {
    type: "info" as const,
    title: "Update ready",
    message: `Aleph ${version} has been downloaded.`,
    detail: "Restart now to install the update?",
    buttons: ["Restart now", "Later"],
    defaultId: 0,
    cancelId: 1,
  }
  try {
    const { response } = win
      ? await dialog.showMessageBox(win, options)
      : await dialog.showMessageBox(options)
    if (response === 0) {
      autoUpdater.quitAndInstall()
    }
  } catch (e) {
    warn("[updater] restart prompt failed:", e)
  }
}

export function initAutoUpdater(): void {
  if (initialized) return
  initialized = true

  if (!app.isPackaged) {
    info("[updater] dev build — automatic updates disabled")
    return
  }

  log.transports.file.level = "info"
  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("checking-for-update", () => {
    info("[updater] checking for update")
  })

  autoUpdater.on("update-available", (releaseInfo) => {
    info(`[updater] update available: ${releaseInfo.version} — downloading`)
  })

  autoUpdater.on("update-not-available", () => {
    info("[updater] no update available")
  })

  autoUpdater.on("update-downloaded", (releaseInfo) => {
    info(`[updater] downloaded ${releaseInfo.version} — prompting restart`)
    void promptRestart(releaseInfo.version)
  })

  autoUpdater.on("error", (e) => {
    // Never interrupt the user for update failures; just log.
    warn("[updater] error:", e)
  })

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((e) => {
      warn("[updater] startup check failed:", e)
    })
  }, STARTUP_CHECK_DELAY_MS)

  setInterval(() => {
    void autoUpdater.checkForUpdates().catch((e) => {
      warn("[updater] periodic check failed:", e)
    })
  }, PERIODIC_CHECK_INTERVAL_MS).unref?.()
}
