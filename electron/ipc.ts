import { app, BrowserWindow, dialog } from "electron"
import fs from "node:fs"
import * as bible from "./services/bible"
import * as hymns from "./services/hymns"
import { pipeline, detectionStatusResult } from "./services/detection-runtime"
import {
  ensureSemanticAssets,
  semanticDownloadStatus,
} from "./services/semantic-download"
import { sharedState } from "./services/state"
import {
  capture,
  startTranscription,
  stopTranscription,
  startAudioTest,
  stopAudioTest,
  getAudioDevices,
  isRunning as sttIsRunning,
  readingModeStatus,
  stopReadingMode,
} from "./services/stt/session"
import {
  allWindowStatuses,
  closeBroadcastWindow,
  ensureBroadcastWindow,
  getBroadcastWindow,
  listMonitors,
  openBroadcastWindow,
  setNdiActiveChecker,
} from "./services/windows"
import * as ndi from "./services/ndi"
import { OscServer } from "./services/remote/osc"
import { HttpServer } from "./services/remote/http"
import { statusSnapshot } from "./services/remote/dispatcher"
import { listSystemFonts } from "./services/fonts"
import { exportDiagnostics } from "./services/diagnostics"
import { storeDelete, storeGet, storeReset, storeSave, storeSet } from "./services/stores"
import * as support from "./services/support"
import { latencyMark, error as logError, info, warn } from "./services/logger"
import { getLogDir, getLogFile } from "./services/logger"
import { userDataDir, resourceDir, projectRoot } from "./services/paths"

/**
 * The invoke router. Command names, argument names (camelCase, as Tauri
 * delivered them) and result shapes are kept identical to the Rust backend
 * so the frontend needs no changes.
 */

export const oscServer = new OscServer()
export const httpServer = new HttpServer()

void capture // routed via handleInvoke below

type Handler = (args: Record<string, unknown>) => unknown | Promise<unknown>

const handlers: Record<string, Handler> = {
  // ------------------------------------------------------------------ bible
  list_translations: () => bible.listTranslations(),

  list_books: (a) => bible.listBooks(num(a.translationId)),

  get_chapter: (a) =>
    bible.getChapter(num(a.translationId), num(a.bookNumber), num(a.chapter)),

  get_verse: (a) =>
    bible.getVerse(
      num(a.translationId),
      num(a.bookNumber),
      num(a.chapter),
      num(a.verse)
    ),

  get_verse_range: (a) =>
    bible.getVerseRange(
      num(a.translationId),
      num(a.bookNumber),
      num(a.chapter),
      num(a.startVerse),
      num(a.endVerse)
    ),

  search_verses: (a) =>
    bible.searchVerses(str(a.query), num(a.translationId), num(a.limit) || 20),

  get_translation_verses_for_search: (a) =>
    bible.getTranslationVersesForSearch(num(a.translationId)),

  get_cross_references: (a) =>
    bible.getCrossReferences(num(a.bookNumber), num(a.chapter), num(a.verse)),

  list_hymn_groups: () => hymns.listHymnGroups(),

  search_hymns: (a) =>
    hymns.searchHymns(
      str(a.query ?? ""),
      typeof a.group === "string" && a.group.length > 0 ? a.group : null,
      num(a.limit) || 25
    ),

  browse_hymns: (a) =>
    hymns.browseHymns(
      typeof a.group === "string" && a.group.length > 0 ? a.group : null,
      num(a.limit) || 50
    ),

  get_hymn: (a) => hymns.getHymn(str(a.id)),

  get_hymn_stanzas: (a) => hymns.getHymnStanzas(str(a.id)),

  get_hymn_tunes: (a) => hymns.getHymnTunes(str(a.id)),

  get_active_translation: () => sharedState().activeTranslationId,

  set_active_translation: (a) => {
    const id = num(a.translationId)
    // Validate against the DB when it's available; with no bundled database
    // yet (fresh checkout), accept the id so the UI keeps working.
    const translations = bible.listTranslations()
    if (translations.length > 0 && !translations.some((t) => t.id === id)) {
      throw new Error("Unknown translation id")
    }
    sharedState().activeTranslationId = id
    pipeline.setActiveTranslation(id)
    return id
  },

  // -------------------------------------------------------------- detection
  detect_verses: async (a) => {
    const text = str(a.text)
    const merged = await pipeline.detectAsync(text)
    return merged.map((m) => pipeline.toResult(m.detection, m.auto_queued, text))
  },

  detection_status: () => detectionStatusResult(),

  semantic_search: async (a) => pipeline.semanticSearch(str(a.query), num(a.limit) || 10),

  // ------------------------------------------------ semantic asset downloads
  semantic_download_start: () => ensureSemanticAssets(),
  semantic_download_status: () => semanticDownloadStatus(),

  reading_mode_status: () => readingModeStatus(),
  stop_reading_mode: () => stopReadingMode(),

  ui_mark: (a) => {
    latencyMark(str(a.label), num(a.epochMs))
    return null
  },

  // ------------------------------------------------------------------ audio
  get_audio_devices: () => getAudioDevices(),

  start_audio_test: async (a) => {
    await startAudioTest(
      optStr(a.deviceId) ?? undefined,
      optNum(a.gain) ?? undefined
    )
    return null
  },

  stop_audio_test: async () => {
    await stopAudioTest()
    return null
  },

  // -------------------------------------------------------------------- stt
  start_transcription: async (a) => {
    await startTranscription({
      apiKey: optStr(a.apiKey) ?? undefined,
      deviceId: optStr(a.deviceId) ?? undefined,
      gain: optNum(a.gain) ?? undefined,
      provider: optStr(a.provider) ?? undefined,
    })
    return null
  },

  stop_transcription: async () => {
    await stopTranscription()
    return null
  },

  stt_is_running: () => sttIsRunning(),

  // -------------------------------------------------------------- broadcast
  list_monitors: () => listMonitors(),

  ensure_broadcast_window: async (a) => {
    await ensureBroadcastWindow(str(a.outputId), optStr(a.title) ?? undefined)
    return null
  },
  open_broadcast_window: async (a) => {
    await openBroadcastWindow(
      str(a.outputId),
      num(a.monitorIndex) || 0,
      optStr(a.title) ?? undefined
    )
    return null
  },

  close_broadcast_window: (a) => {
    closeBroadcastWindow(str(a.outputId))
    return null
  },

  start_ndi: async (a) => {
    const req = a.request as ndi.NdiStartRequest | undefined
    if (!req) throw new Error("Missing NDI request")
    return ndi.startNdi(str(a.outputId), req)
  },

  stop_ndi: (a) => {
    ndi.stopNdi(str(a.outputId))
    return null
  },

  get_ndi_status: (a) => ndi.getNdiStatus(str(a.outputId)),

  push_ndi_frame: (a) => ndi.pushNdiFrame(a.request as never),

  // ------------------------------------------------------------------ fonts
  list_system_fonts: () => listSystemFonts(),

  // ----------------------------------------------------------------- remote
  update_remote_status: (a) => {
    if ("onAir" in a && a.onAir !== undefined && a.onAir !== null)
      statusSnapshot.on_air = Boolean(a.onAir)
    if ("activeTheme" in a) statusSnapshot.active_theme = (a.activeTheme as string) ?? null
    if ("liveVerse" in a) statusSnapshot.live_verse = (a.liveVerse as string) ?? null
    if ("queueLength" in a && a.queueLength !== undefined && a.queueLength !== null)
      statusSnapshot.queue_length = Number(a.queueLength)
    if (
      "confidenceThreshold" in a &&
      a.confidenceThreshold !== undefined &&
      a.confidenceThreshold !== null
    )
      statusSnapshot.confidence_threshold = Number(a.confidenceThreshold)
    return null
  },

  start_osc: async (a) => oscServer.start(optNum(a.port) ?? undefined),

  stop_osc: async () => {
    await oscServer.stop()
    return null
  },

  get_osc_status: () => ({ running: oscServer.isRunning(), port: oscServer.isRunning() ? oscServer.boundPort() : null }),

  start_http: async (a) => httpServer.start(optNum(a.port) ?? undefined),

  stop_http: async () => {
    await httpServer.stop()
    return null
  },

  get_http_status: () => ({
    running: httpServer.isRunning(),
    port: httpServer.isRunning() ? httpServer.boundPort() : null,
  }),

  // ------------------------------------------------------------- diagnostics
  export_diagnostics: (a) =>
    exportDiagnostics(
      a.sinceMinutes === null || a.sinceMinutes === undefined
        ? null
        : Number(a.sinceMinutes)
    ),

  // ------------------------------------------------------- internal channels
  __get_version: () => app.getVersion(),
  __get_log_dir: () => getLogDir(),
  __get_log_file: () => getLogFile(),
  __get_data_dir: () => userDataDir(),
  __get_resource_dir: () => resourceDir(),
  __get_project_root: () => projectRoot(),
  __get_all_windows: () => allWindowStatuses(),

  __log: (a) => {
    const level = String(a.level)
    const message = String(a.message)
    if (level === "error") logError(`[ui] ${message}`)
    else if (level === "warn") warn(`[ui] ${message}`)
    else if (level === "debug") info(`[ui-debug] ${message}`)
    else info(`[ui] ${message}`)
    return null
  },

  __store_get: (a) => storeGet(str(a.store), str(a.key)),
  __store_set: (a) => {
    storeSet(str(a.store), str(a.key), a.value)
    return null
  },
  __store_delete: (a) => {
    storeDelete(str(a.store), str(a.key))
    return null
  },
  __store_save: (a) => {
    storeSave(str(a.store))
    return null
  },
  __store_reset: (a) => {
    storeReset(str(a.store))
    return null
  },

  __dialog_open: async (a) => {
    const options = (a.options ?? {}) as Record<string, unknown>
    const filters = Array.isArray(options.filters)
      ? (
          options.filters as Array<{ name: string; extensions: string[] }>
        ).map((f) => ({ name: f.name, extensions: f.extensions }))
      : undefined
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const props: Electron.OpenDialogOptions = {
      properties: ["openFile"],
      filters,
    }
    if (options.directory) props.properties = ["openDirectory"]
    if (options.multiple) props.properties?.push("multiSelections")
    const result = options.directory
      ? await dialog.showOpenDialog(win, props)
      : await dialog.showOpenDialog(win, props)
    if (result.canceled || result.filePaths.length === 0) return null
    return options.multiple ? result.filePaths : result.filePaths[0]
  },

  __dialog_save: async (a) => {
    const options = (a.options ?? {}) as Record<string, unknown>
    const filters = Array.isArray(options.filters)
      ? (
          options.filters as Array<{ name: string; extensions: string[] }>
        ).map((f) => ({ name: f.name, extensions: f.extensions }))
      : undefined
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = await dialog.showSaveDialog(win, {
      defaultPath: (options.defaultPath as string) ?? undefined,
      filters,
    })
    return result.canceled || !result.filePath ? null : result.filePath
  },

  __fs_read_file: (a) => {
    const file = str(a.path)
    try {
      const buffer = fs.readFileSync(file)
      // Return a copy of the underlying ArrayBuffer for structured clone.
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer
    } catch (e) {
      throw new Error(`Failed to read ${file}: ${String(e)}`)
    }
  },

  __fs_write_text_file: (a) => {
    const file = str(a.path)
    try {
      fs.mkdirSync(file.replace(/[\\/][^\\/]+$/, ""), { recursive: true })
      fs.writeFileSync(file, String(a.contents), "utf8")
    } catch (e) {
      throw new Error(`Failed to write ${file}: ${String(e)}`)
    }
    return null
  },

  support_create_checkout: (a) => support.createCheckout(str(a.tier)),

  support_resume_checkout: (a) => support.resumeCheckout(str(a.token)),

  support_order_status: (a) => support.getOrderStatus(str(a.token)),
}

// ---------------------------------------------------------------------------

function str(v: unknown): string {
  if (typeof v === "string") return v
  if (v === null || v === undefined) return ""
  throw new Error(`Expected string argument, got ${typeof v}`)
}

function num(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) {
    throw new Error(`Expected number argument, got ${String(v)}`)
  }
  return n
}

function optStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : v === "" ? "" : null
}

function optNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Route one invoke call; throws mirror Rust command errors (strings). */
export async function handleInvoke(
  command: string,
  args: Record<string, unknown>,
  sender?: Electron.WebContents
): Promise<unknown> {
  // Messages from the hidden capture window route into its manager.
  if (sender && command.startsWith("__capture_")) {
    capture.handleCaptureMessage(command, args)
    return null
  }

  const handler = handlers[command]
  if (!handler) {
    throw new Error(`Unknown command: ${command}`)
  }
  try {
    return await handler(args)
  } catch (e) {
    logError(`[ipc] ${command} failed:`, e)
    throw e instanceof Error ? e.message : String(e)
  }
}

// NDI-aware window closing (close_broadcast_window hides instead).
setNdiActiveChecker((outputId) => ndi.isNdiActive(outputId))

export function broadcastWindowFor(outputId: string): BrowserWindow | null {
  return getBroadcastWindow(outputId)
}
