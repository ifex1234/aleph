import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { info, warn } from "../logger"
import { projectRoot, resourceDir } from "../paths"
import type { SttEvent } from "./deepgram"
import { CORE_KEYTERMS, bibleKeyterms } from "./keyterms"
import {
  WHISPER_SAMPLE_RATE,
  parseWhisperStdout,
  pcm16ToWav,
  rmsOfPcm16,
} from "./whisper-audio"

/**
 * Local Whisper engine backed by the whisper.cpp CLI (`whisper-cli`).
 *
 * The capture pipeline already delivers 16 kHz mono PCM16 — the exact
 * format whisper.cpp expects — so sendAudio() accumulates it into fixed
 * windows, wraps each in a WAV header, and transcribes with a local
 * binary + GGML model. Events mirror DeepgramStreamClient's SttEvent so
 * the session layer treats providers interchangeably:
 *
 * - "final" fires once per completed window (latency ≈ window + inference;
 *   no interim partials — the live transcript updates per window).
 * - "speechStarted" fires on rising-edge energy detection.
 *
 * One-time setup:
 *   bun run download:whisper-bin  → sdk/whisper/<platform>/whisper-cli
 *   bun run download:whisper      → models/whisper/ggml-large-v3-turbo-q8_0.bin
 * Overrides: ALEPH_WHISPER_BIN / ALEPH_WHISPER_MODEL.
 */

const WINDOW_MS = 5000
const BYTES_PER_MS = (WHISPER_SAMPLE_RATE * 2) / 1000
const WINDOW_BYTES = WINDOW_MS * BYTES_PER_MS
const MIN_FINAL_BYTES = BYTES_PER_MS * 500 // skip sub-0.5 s stop-time tails
const SPEECH_RMS_ENTER = 0.01 // normalized; rising edge → speechStarted
const SPEECH_RMS_EXIT = 0.006 // hysteresis so the indicator doesn't flicker
const MAX_QUEUED_WINDOWS = 3 // bound memory/CPU when inference lags behind live audio
const RESULT_CONFIDENCE = 0.9 // whisper.cpp exposes no stream-level score

export interface WhisperPaths {
  bin: string
  model: string
}

const DEFAULT_MODEL_FILE = "ggml-large-v3-turbo-q8_0.bin"

function firstExisting(candidates: Array<string | undefined>): string | null {
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) return candidate
    } catch {
      // Unreadable path — keep looking.
    }
  }
  return null
}

/** Locates the whisper.cpp CLI, throwing an actionable error if absent. */
export function resolveWhisperBin(): string {
  const exeSuffix = process.platform === "win32" ? ".exe" : ""
  const binName = `whisper-cli${exeSuffix}`
  const platformDir =
    process.platform === "win32"
      ? "win32"
      : process.platform === "darwin"
        ? "macos"
        : "linux"

  const bin = firstExisting([
    process.env.ALEPH_WHISPER_BIN,
    path.join(resourceDir(), "whisper", binName),
    path.join(projectRoot(), "sdk", "whisper", platformDir, binName),
    path.join(projectRoot(), "sdk", "whisper", platformDir, "bin", binName),
    "/opt/homebrew/bin/whisper-cli",
    "/usr/local/bin/whisper-cli",
  ])

  if (!bin) {
    throw new Error(
      `Local Whisper binary not found. Run 'bun run download:whisper-bin' ` +
        `(or install whisper.cpp and set ALEPH_WHISPER_BIN to the whisper-cli path).`
    )
  }
  return bin
}

/** Locates a GGML Whisper model, preferring large-v3-turbo q8_0. */
export function resolveWhisperModel(): string {
  const modelDir = path.join(projectRoot(), "models", "whisper")
  const model = firstExisting([
    process.env.ALEPH_WHISPER_MODEL,
    path.join(modelDir, DEFAULT_MODEL_FILE),
  ])
  if (model) return model

  // Any other GGML model the user dropped into models/whisper is fine too —
  // smaller models trade accuracy for speed on modest hardware.
  if (fs.existsSync(modelDir)) {
    const fallback = fs
      .readdirSync(modelDir)
      .filter((f) => /^ggml-.*\.bin$/i.test(f))
      .sort()
      .at(-1)
    if (fallback) return path.join(modelDir, fallback)
  }

  throw new Error(
    `Whisper model not found under models/whisper/. ` +
      `Run 'bun run download:whisper' or set ALEPH_WHISPER_MODEL.`
  )
}

interface WindowJob {
  pcm: Buffer
  file: string
}

export class WhisperLocalClient {
  onEvent: (e: SttEvent) => void = () => {}

  readonly bin: string
  readonly model: string
  private prompt: string
  private tempDir: string
  private windowSeq = 0

  private closed = true
  private pending: Buffer[] = []
  private pendingBytes = 0
  private queue: WindowJob[] = []
  private pumpChain: Promise<void> = Promise.resolve()
  private speaking = false
  private stopping: Promise<void> | null = null

  constructor() {
    this.bin = resolveWhisperBin()
    this.model = resolveWhisperModel()
    this.prompt = [...CORE_KEYTERMS, ...bibleKeyterms()].slice(0, 50).join(", ")
    this.tempDir = ""
  }

  start(): void {
    this.closed = false
    this.pending = []
    this.pendingBytes = 0
    this.queue = []
    this.speaking = false
    this.windowSeq = 0
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aleph-whisper-"))
    info(
      `[STT-whisper] started (bin=${this.bin}, model=${path.basename(this.model)}, window=${WINDOW_MS}ms)`
    )
    this.onEvent({ type: "connected" })
  }

  /** Queue PCM (16-bit LE mono @16 kHz); rotates a window every WINDOW_MS. */
  sendAudio(samples: Buffer): void {
    if (this.closed) return

    const rms = rmsOfPcm16(samples)
    if (!this.speaking && rms >= SPEECH_RMS_ENTER) {
      this.speaking = true
      this.onEvent({ type: "speechStarted" })
    } else if (this.speaking && rms < SPEECH_RMS_EXIT) {
      this.speaking = false
    }

    this.pending.push(samples)
    this.pendingBytes += samples.length
    if (this.pendingBytes >= WINDOW_BYTES) this.rotateWindow()
  }

  /** Driven by the session's 50 ms keepalive ticker; nothing to flush mid-window. */
  tick(): void {}

  /**
   * Stops the engine. The in-flight window finishes and any meaningful
   * tail (<1 window of audio) is transcribed before the promise resolves,
   * so trailing speech still produces transcript + detection events.
   */
  stop(): Promise<void> {
    if (this.stopping) return this.stopping
    this.closed = true
    this.stopping = (async () => {
      if (this.pendingBytes >= MIN_FINAL_BYTES) {
        this.rotateWindow()
      }
      this.pending = []
      this.pendingBytes = 0
      await this.pumpChain
      this.removeTempDir()
      info("[STT-whisper] stopped")
    })()
    return this.stopping
  }

  private rotateWindow(): void {
    const merged = Buffer.concat(this.pending, this.pendingBytes)
    this.pending = []
    this.pendingBytes = 0

    if (this.queue.length >= MAX_QUEUED_WINDOWS) {
      warn("[STT-whisper] inference backlog — dropping oldest window")
      this.queue.shift()
    }
    this.queue.push({
      pcm: merged,
      file: path.join(this.tempDir, `window-${++this.windowSeq}.wav`),
    })
    this.pumpChain = this.pumpChain.then(() => this.step())
  }

  private async step(): Promise<void> {
    const job = this.queue.shift()
    if (!job) return
    await this.transcribeWindow(job)
    await this.step()
  }

  private async transcribeWindow(job: WindowJob): Promise<void> {
    let stdout = ""
    try {
      fs.writeFileSync(job.file, pcm16ToWav(job.pcm))
      stdout = await this.runCli(job.file)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      warn(`[STT-whisper] window failed: ${message}`)
      this.onEvent({ type: "error", message })
      return
    } finally {
      try {
        fs.rmSync(job.file, { force: true })
      } catch {
        // Best effort cleanup.
      }
    }

    const transcript = parseWhisperStdout(stdout)
    if (!transcript) return
    this.onEvent({
      type: "final",
      transcript,
      words: [],
      confidence: RESULT_CONFIDENCE,
      speechFinal: true,
    })
  }

  private runCli(wavFile: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        "-m",
        this.model,
        "-f",
        wavFile,
        "-nt", // no timestamps → plain text on stdout
        "-np", // suppress non-result prints
        "--prompt",
        this.prompt,
      ]
      const proc = spawn(this.bin, args, { stdio: ["ignore", "pipe", "pipe"] })
      let stdout = ""
      proc.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString()
      })
      proc.on("error", (err) =>
        reject(
          new Error(
            `whisper-cli failed to start (${err.message}). If the binary is ` +
              `broken or missing DLLs, re-run 'bun run download:whisper-bin'.`
          )
        )
      )
      proc.on("close", (code) => {
        if (stdout.trim().length > 0 || code === 0) resolve(stdout)
        else reject(new Error(`whisper-cli exited with ${code}`))
      })
    })
  }

  private removeTempDir(): void {
    if (!this.tempDir) return
    try {
      fs.rmSync(this.tempDir, { recursive: true, force: true })
    } catch {
      // Best effort cleanup.
    } finally {
      this.tempDir = ""
    }
  }
}
