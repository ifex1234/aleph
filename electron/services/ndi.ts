import fs from "node:fs"
import { ndiLibraryPath } from "./paths"
import { info, warn, error as logError } from "./logger"

/**
 * NDI sender via dynamic FFI (koffi) to the NDI runtime library — the same
 * DLL/dylib/so the Rust backend loaded with libloading. The FFI surface is
 * tiny: initialize, send_create, send_send_video_v2, send_destroy, destroy.
 *
 * Everything degrades gracefully: if koffi or the library is missing,
 * start_ndi throws a descriptive error and the rest of the app keeps working.
 */

interface NdiSession {
  sourceName: string
  width: number
  height: number
  fps: number
  alphaMode: string
  sendPtr: unknown
  framesSent: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let ffi: {
  initialize: () => boolean
  destroy: () => void
  sendCreate: (desc: Record<string, unknown>) => any
  sendDestroy: (send: any) => void
  sendVideoV2: (send: any, frame: Record<string, unknown>) => boolean
} | null = null
let initialized = false
let loadAttempted = false

const sessions = new Map<string, NdiSession>()

const FOURCC_BGRA = 0x41524742 // 'BGRA' as little-endian u32
const TIMECODE_SYNTHESIZE = 9223372036854775807n // INT64_MAX

export interface NdiStartRequest {
  sourceName: string
  resolution: "r720p" | "r1080p" | "r4k"
  frameRate: "fps24" | "fps30" | "fps60"
  alphaMode: "noneOpaque" | "straightAlpha" | "premultipliedAlpha"
}

export function resolutionDimensions(
  r: NdiStartRequest["resolution"]
): { width: number; height: number } {
  if (r === "r720p") return { width: 1280, height: 720 }
  if (r === "r4k") return { width: 3840, height: 2160 }
  return { width: 1920, height: 1080 }
}

export function frameRateNumber(f: NdiStartRequest["frameRate"]): number {
  if (f === "fps24") return 24
  if (f === "fps60") return 60
  return 30
}

function loadFfi(): typeof ffi {
  if (loadAttempted) return ffi
  loadAttempted = true

  let koffi: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    koffi = require("koffi")
  } catch {
    warn("[ndi] koffi is not installed — NDI output unavailable")
    return null
  }

  const libPath = ndiLibraryPath()
  if (!libPath || !fs.existsSync(libPath)) {
    warn("[ndi] NDI runtime library not found — NDI output unavailable")
    return null
  }

  try {
    const lib = koffi.load(libPath)

    const SendHandle = koffi.opaque("NDI_send")

    koffi.struct("NDIlib_send_create_t", {
      p_ndi_name: "const char *",
      p_groups: "const char *",
      clock_video: "bool",
      clock_audio: "bool",
    })

    koffi.struct("NDIlib_video_frame_v2_t", {
      xres: "int",
      yres: "int",
      fourcc: "uint32",
      frame_rate_N: "int",
      frame_rate_D: "int",
      picture_aspect_ratio: "float",
      frame_format_type: "int",
      timecode: "int64_t",
      p_data: "uint8_t *",
      line_stride_in_bytes: "int",
      p_metadata: "const char *",
      timestamp: "int64_t",
    })

    ffi = {
      initialize: lib.func("bool NDIlib_initialize()"),
      destroy: lib.func("void NDIlib_destroy()"),
      sendCreate: lib.func(
        "NDI_send *NDIlib_send_create(_In_ const NDIlib_send_create_t *desc)"
      ),
      sendDestroy: lib.func("void NDIlib_send_destroy(NDI_send *send)"),
      sendVideoV2: lib.func(
        "bool NDIlib_send_send_video_v2(NDI_send *send, _In_ const NDIlib_video_frame_v2_t *frame)"
      ),
    }
    void SendHandle
    info(`[ndi] loaded NDI runtime: ${libPath}`)
    return ffi
  } catch (e) {
    warn("[ndi] failed to bind NDI library:", e)
    return null
  }
}

function ensureInit(): boolean {
  const f = loadFfi()
  if (!f) return false
  if (!initialized) {
    try {
      if (!f.initialize()) {
        logError("[ndi] NDIlib_initialize failed")
        return false
      }
      initialized = true
      info("[ndi] NDI runtime initialized")
    } catch (e) {
      logError(`[ndi] init threw: ${String(e)}`)
      return false
    }
  }
  return true
}

export async function startNdi(outputId: string, request: NdiStartRequest): Promise<{
  sourceName: string
  resolution: string
  frameRate: string
  alphaMode: string
  width: number
  height: number
  fps: number
}> {
  const existing = sessions.get(outputId)
  if (existing) stopNdiInternal(outputId)

  if (!request.sourceName || request.sourceName.trim() === "") {
    throw new Error("EmptySourceName")
  }
  if (!ensureInit()) {
    throw new Error(
      "NDI runtime unavailable. Install the NDI runtime (sdk/) and keep koffi installed."
    )
  }

  let sendPtr: unknown
  try {
    sendPtr = ffi!.sendCreate({
      p_ndi_name: request.sourceName.trim(),
      p_groups: null,
      clock_video: false,
      clock_audio: false,
    })
  } catch (e) {
    throw new Error(`NDIlib_send_create failed: ${String(e)}`)
  }
  if (!sendPtr) throw new Error("NDIlib_send_create returned null")

  const dims = resolutionDimensions(request.resolution)
  const fps = frameRateNumber(request.frameRate)
  sessions.set(outputId, {
    sourceName: request.sourceName.trim(),
    width: dims.width,
    height: dims.height,
    fps,
    alphaMode: request.alphaMode,
    sendPtr,
    framesSent: 0,
  })
  info(
    `[ndi] session '${outputId}' → '${request.sourceName.trim()}' ${dims.width}x${dims.height}@${fps}`
  )

  return {
    sourceName: request.sourceName.trim(),
    resolution: request.resolution,
    frameRate: request.frameRate,
    alphaMode: request.alphaMode,
    width: dims.width,
    height: dims.height,
    fps,
  }
}

function stopNdiInternal(outputId: string): void {
  const session = sessions.get(outputId)
  if (!session) return
  try {
    ffi?.sendDestroy(session.sendPtr)
  } catch (e) {
    warn("[ndi] send_destroy failed:", e)
  }
  sessions.delete(outputId)
  info(`[ndi] session '${outputId}' stopped`)
}

export function stopNdi(outputId: string): void {
  stopNdiInternal(outputId)
}

export interface NdiStatusResponse {
  active: boolean
  width?: number
  height?: number
  fps?: number
}

export function getNdiStatus(outputId: string): NdiStatusResponse | null {
  const s = sessions.get(outputId)
  if (!s) return null
  return { active: true, width: s.width, height: s.height, fps: s.fps }
}

export function isNdiActive(outputId: string): boolean {
  return sessions.has(outputId)
}

/** RGBA base64 → BGRA buffer → NDI send. */
export async function pushNdiFrame(req: {
  outputId: string
  width: number
  height: number
  rgbaBase64: string
}): Promise<void> {
  const session = sessions.get(req.outputId)
  if (!session) throw new Error(`No active NDI session for output '${req.outputId}'`)
  const f = loadFfi()
  if (!f) throw new Error("NDI not initialized")

  if (req.width !== session.width || req.height !== session.height) {
    throw new Error(
      `Frame size ${req.width}x${req.height} does not match session ${session.width}x${session.height}`
    )
  }

  const rgba = Buffer.from(req.rgbaBase64, "base64")
  const expected = req.width * req.height * 4
  if (rgba.length !== expected) {
    throw new Error(`Frame payload is ${rgba.length} bytes, expected ${expected}`)
  }

  // RGBA → BGRA in place (swap R and B), honoring the alpha mode.
  const opaque = session.alphaMode === "noneOpaque"
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i]
    rgba[i] = rgba[i + 2]
    rgba[i + 2] = r
    if (opaque) rgba[i + 3] = 255
  }

  session.framesSent++
  if (session.framesSent % 300 === 1) {
    info(`[ndi] '${session.sourceName}' sent ${session.framesSent} frames`)
  }

  const ok = f.sendVideoV2(session.sendPtr, {
    xres: req.width,
    yres: req.height,
    fourcc: FOURCC_BGRA,
    frame_rate_N: session.fps * 1000,
    frame_rate_D: 1001,
    picture_aspect_ratio: req.width / req.height,
    frame_format_type: 1, // progressive
    timecode: TIMECODE_SYNTHESIZE,
    p_data: rgba,
    line_stride_in_bytes: req.width * 4,
    p_metadata: null,
    timestamp: 0n,
  })
  if (!ok) {
    // Transient failures are non-fatal; receivers resync on later frames.
    warn("[ndi] send_video_v2 returned false")
  }
}

export function shutdownNdi(): void {
  for (const id of [...sessions.keys()]) stopNdiInternal(id)
  if (initialized) {
    try {
      ffi?.destroy()
    } catch {
      // Ignore.
    }
    initialized = false
  }
}
