import { app, dialog } from "electron"
import { autoUpdater } from "electron-updater"
import log from "electron-log"
import { info, warn } from "./logger"
import { emitAll, emitToWindow, windowsByLabel } from "./events"

/**
 * In-app updates via electron-updater + GitHub Releases (see the `publish`
 * section of electron-builder.yml).
 *
 * - No-ops entirely in dev (updates only make sense in packaged builds).
 * - Checks on startup (after a grace delay) and every 6 hours.
 * - Ask-first flow: finding a release prompts the RENDERER (banner + Help-tab
 *   card), which calls back through the __updater_* channels to download and
 *   install. Nothing downloads until the user accepts. The OS dialog is only
 *   a fallback for when no main window exists to render the banner.
 * - autoInstallOnAppQuit still installs an accepted-but-postponed download
 *   when Aleph quits.
 */

const STARTUP_CHECK_DELAY_MS = 15_000
const PERIODIC_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

let initialized = false

export type UpdaterPhase = "idle" | "available" | "downloading" | "ready"

export interface UpdaterState {
  enabled: boolean
  phase: UpdaterPhase
  version: string
  /** 0–100 while downloading, else 0. */
  percent: number
}

const state: UpdaterState = {
  enabled: false,
  phase: "idle",
  version: "",
  percent: 0,
}

function setPhase(phase: UpdaterPhase, changes: Partial<UpdaterState> = {}): void {
  Object.assign(state, changes, { phase })
  // The renderer may miss broadcasts (mounted late, window reload mid-flow),
  // so it hydrates via get_state instead of relying on events alone.
  emitAll("__updater_state", { ...state })
  info(`[updater] state → ${phase}`, state.version || "")
}

function mainWindow() {
  return windowsByLabel().get("main") ?? undefined
}

export function updaterState(): UpdaterState {
  return { ...state }
}

/** User accepted the download (from the banner / Help card / OS fallback). */
export async function acceptDownload(): Promise<UpdaterState> {
  if (state.phase !== "available") return updaterState()
  const version = state.version
  info(`[updater] user accepted download of ${version}`)
  setPhase("downloading", { percent: 0 })
  try {
    await autoUpdater.downloadUpdate()
  } catch (e) {
    warn("[updater] download failed:", e)
    // Surface the failure softly; the next periodic check re-offers anyway.
    setPhase("available", { percent: 0 })
  }
  return updaterState()
}

export function installNow(): void {
  if (state.phase !== "ready") return
  info(`[updater] user chose to install ${state.version}`)
  autoUpdater.quitAndInstall()
}

/** Manual "check for updates" the user can trigger from the Help tab. */
export async function checkNow(): Promise<UpdaterState> {
  if (initialized && state.enabled) {
    try {
      await autoUpdater.checkForUpdates()
    } catch (e) {
      warn("[updater] manual check failed:", e)
    }
  }
  return updaterState()
}

/** OS dialog fallback when there is no main window to show the banner. */
async function fallbackDialog(version: string): Promise<void> {
  const win = mainWindow()
  const options = {
    type: "info" as const,
    title: "Update available",
    message: `Aleph ${version} is now available.`,
    detail:
      "Download and install the new version? The download runs in the background and Aleph stays usable while it fetches.",
    buttons: ["Download now", "Not now"],
    defaultId: 0,
    cancelId: 1,
  }
  try {
    const { response } = win
      ? await dialog.showMessageBox(win, options)
      : await dialog.showMessageBox(options)
    if (response === 0) void acceptDownload()
    else info(`[updater] user deferred download of ${version}`)
  } catch (e) {
    warn("[updater] fallback dialog failed:", e)
  }
}

export function initAutoUpdater(): void {
  if (initialized) return
  initialized = true

  if (!app.isPackaged) {
    info("[updater] dev build — automatic updates disabled")
    return
  }

  state.enabled = true

  log.transports.file.level = "info"
  autoUpdater.logger = log
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Test escape hatch: serve a feed from any static HTTP server instead of
  // GitHub Releases (see Server/testing docs). Set nothing in production.
  //   set ALEPH_UPDATE_FEED_URL=http://localhost:9000/
  const testFeedUrl = process.env.ALEPH_UPDATE_FEED_URL
  if (testFeedUrl) {
    info(`[updater] test override — update feed served from ${testFeedUrl}`)
    autoUpdater.setFeedURL({ provider: "generic", url: testFeedUrl })
  }

  autoUpdater.on("checking-for-update", () => {
    info("[updater] checking for update")
  })

  autoUpdater.on("update-available", (releaseInfo) => {
    info(`[updater] update available: ${releaseInfo.version} — prompting in-app`)
    setPhase("available", { version: releaseInfo.version, percent: 0 })
    if (!emitToWindow("main", "__updater_state", { ...state })) {
      void fallbackDialog(releaseInfo.version)
    }
  })

  autoUpdater.on("update-not-available", () => {
    info("[updater] no update available")
    // A manual check from zero can only ever see idle; don't fight a
    // downloaded-but-not-installed state with it.
    if (state.phase === "idle") emitAll("__updater_state", { ...state })
  })

  autoUpdater.on("download-progress", (progress) => {
    state.percent = Math.round(progress.percent)
    emitToWindow("main", "__updater_state", { ...state })
  })

  autoUpdater.on("update-downloaded", (releaseInfo) => {
    info(`[updater] downloaded ${releaseInfo.version} — prompting restart in-app`)
    setPhase("ready", { version: releaseInfo.version, percent: 100 })
  })

  autoUpdater.on("error", (e) => {
    // Never interrupt the user for update failures; just log and reset.
    warn("[updater] error:", e)
    if (state.phase === "downloading") {
      setPhase("available", { percent: 0 })
    }
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
