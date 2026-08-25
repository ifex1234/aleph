import { BrowserWindow, app } from "electron"
import path from "node:path"
import fs from "node:fs"
import { info, warn } from "../logger"
import { CAPTURE_HTML } from "./capture-html"

/**
 * Hidden renderer that owns microphone capture via getUserMedia +
 * ScriptProcessor: mono downmix, gain clamp, linear resample to 16 kHz,
 * Int16 conversion, RMS/peak metering. PCM flows to the main process over
 * IPC, mirroring the Rust cpal fan-out thread's output contract.
 *
 * A dedicated window (rather than piggybacking on the main window) keeps
 * capture alive across main-window reloads, like the Tauri backend did.
 */

export interface CaptureDeviceInfo {
  id: string
  name: string
  sample_rate: number
  channels: number
  is_default: boolean
}

export type CaptureStatusEvent =
  | { event: "lost" }
  | { event: "recovered" }
  | { event: "error"; detail?: string }

const SAMPLE_RATE = 16000

function captureHtmlPath(): string {
  const dir = path.join(app.getPath("userData"), "generated")
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, "capture.html")
  fs.writeFileSync(file, CAPTURE_HTML)
  return file
}

export class CaptureManager {
  private win: BrowserWindow | null = null
  private statusHandler: ((e: CaptureStatusEvent) => void) | null = null
  private pcmHandler: ((samples: Buffer) => void) | null = null
  private levelHandler: ((rms: number, peak: number) => void) | null = null
  private devicesResolver: ((d: CaptureDeviceInfo[]) => void) | null = null
  private watchdog: NodeJS.Timeout | null = null
  private lastPcmAt = 0
  private lost = false

  setStatusHandler(h: (e: CaptureStatusEvent) => void): void {
    this.statusHandler = h
  }
  setPcmHandler(h: (samples: Buffer) => void): void {
    this.pcmHandler = h
  }
  setLevelHandler(h: (rms: number, peak: number) => void): void {
    this.levelHandler = h
  }

  async ensureWindow(): Promise<BrowserWindow> {
    if (this.win && !this.win.isDestroyed()) return this.win
    const win = new BrowserWindow({
      show: false,
      width: 320,
      height: 240,
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    ;(win as BrowserWindow & { __alephLabel?: string }).__alephLabel =
      "__capture__"
    await win.loadFile(captureHtmlPath())
    this.win = win
    this.lastPcmAt = Date.now()
    info("[capture] window created")
    return win
  }

  /** Messages arriving from the capture page via the preload invoke channel. */
  handleCaptureMessage(channel: string, payload: Record<string, unknown>): void {
    switch (channel) {
      case "__capture_pcm": {
        const arr = payload.samples as Int16Array
        if (!arr) return
        this.lastPcmAt = Date.now()
        this.pcmHandler?.(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength))
        break
      }
      case "__capture_level": {
        this.levelHandler?.(
          Number(payload.rms ?? 0),
          Number(payload.peak ?? 0)
        )
        break
      }
      case "__capture_status": {
        const ev = payload.event as string
        info(`[capture] status: ${ev}`)
        if (ev === "lost") {
          this.lost = true
          this.statusHandler?.({ event: "lost" })
          this.startRecovery()
        } else if (ev === "recovered") {
          this.lost = false
          this.statusHandler?.({ event: "recovered" })
        } else if (ev === "error") {
          this.statusHandler?.({ event: "error", detail: String(payload.detail ?? "") })
        }
        break
      }
      case "__capture_devices": {
        this.devicesResolver?.((payload.devices as CaptureDeviceInfo[]) ?? [])
        this.devicesResolver = null
        break
      }
    }
  }

  async listDevices(): Promise<CaptureDeviceInfo[]> {
    const win = await this.ensureWindow()
    const devices = await new Promise<CaptureDeviceInfo[]>((resolve) => {
      this.devicesResolver = resolve
      win.webContents.send("aleph:event", { event: "audio:enumerate", payload: null })
      setTimeout(() => {
        if (this.devicesResolver === resolve) {
          this.devicesResolver = null
          resolve([])
        }
      }, 3000)
    })
    return devices
  }

  async start(deviceId: string | null, gain: number): Promise<void> {
    const win = await this.ensureWindow()
    this.lastPcmAt = Date.now()
    this.lost = false
    this.startWatchdog()
    win.webContents.send("aleph:event", {
      event: "audio:start",
      payload: { deviceId, gain },
    })
  }

  stop(): void {
    if (this.watchdog) {
      clearInterval(this.watchdog)
      this.watchdog = null
    }
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send("aleph:event", {
        event: "audio:stop",
        payload: null,
      })
    }
  }

  destroy(): void {
    this.stop()
    if (this.win && !this.win.isDestroyed()) this.win.destroy()
    this.win = null
  }

  /** Silence watchdog: no PCM for >2 s means the source vanished. */
  private startWatchdog(): void {
    if (this.watchdog) clearInterval(this.watchdog)
    this.watchdog = setInterval(() => {
      if (!this.lost && Date.now() - this.lastPcmAt > 2000) {
        warn("[capture] watchdog: no PCM for 2s — treating as device loss")
        this.lost = true
        this.statusHandler?.({ event: "lost" })
        this.startRecovery()
      }
    }, 500)
  }

  /** Ask the page to rebuild its stream until it succeeds again. */
  private startRecovery(): void {
    if (!this.win || this.win.isDestroyed()) return
    const timer = setInterval(() => {
      if (!this.win || this.win.isDestroyed()) {
        clearInterval(timer)
        return
      }
      this.win.webContents.send("aleph:event", {
        event: "audio:start",
        payload: { deviceId: null, gain: "retry" },
      })
    }, 750)
    // The page reports "recovered" once audio flows; clear the retry timer then.
    const original = this.statusHandler
    this.statusHandler = (e) => {
      if (e.event === "recovered") clearInterval(timer)
      original?.(e)
      if (e.event === "recovered") this.statusHandler = original
    }
  }

  static readonly TARGET_SAMPLE_RATE = SAMPLE_RATE
}
