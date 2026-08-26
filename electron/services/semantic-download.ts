import { app, net } from "electron"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { emitAll } from "./events"
import { info, warn } from "./logger"
import { assetsMissing, resetForReload } from "./detection/semantic"

/**
 * Download-on-first-run for the semantic search assets. Release installers
 * stay lean; on first launch of a packaged build (or via the
 * semantic_download_start command) this fetches:
 *
 *   - models/qwen3-embedding-0.6b-int8/model_quantized.onnx  (~571 MB)
 *   - models/qwen3-embedding-0.6b-int8/tokenizer.json        (~11 MB)
 *   - embeddings/kjv-qwen3-0.6b.bin                          (~120 MB)
 *   - embeddings/kjv-qwen3-0.6b-ids.bin                      (~0.25 MB)
 *
 * into the per-user data dir and reloads the embedder without an app
 * restart. Files land under userData so updates/ reinstalls don't re-fetch.
 *
 * Integrity: every release asset has a `<name>.sha256` sidecar uploaded
 * next to it; downloads are verified against it before being moved into
 * place. A missing sidecar is tolerated (warned), a mismatch is not.
 *
 * Hosting override: set ALEPH_EMBEDDING_BASE_URL to a CDN root containing
 * the same flat asset names; defaults to the project's GitHub releases.
 */

const DEFAULT_BASE_URL =
  "https://github.com/openbezal/aleph/releases/latest/download"
const TOKENIZER_URL =
  "https://huggingface.co/Qwen/Qwen3-Embedding-0.6B/resolve/main/tokenizer.json"

const MODEL_DIR_NAME = "qwen3-embedding-0.6b-int8"
const MODEL_ASSET = "Aleph-qwen3-embedding-0.6b-int8.onnx"
const VECTORS_ASSET = "Aleph-kjv-qwen3-0.6b.bin"
const IDS_ASSET = "Aleph-kjv-qwen3-0.6b-ids.bin"

export type SemanticDownloadState = "idle" | "running" | "ready" | "failed"

export interface SemanticDownloadStatus {
  state: SemanticDownloadState
  /** Human-readable current file while running. */
  file: string | null
  bytesDone: number
  bytesTotal: number
  error: string | null
}

interface AssetTarget {
  label: string
  url: string
  dest: string
}

function baseUrl(): string {
  return (
    process.env.ALEPH_EMBEDDING_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_BASE_URL
  )
}

/** The download dir roots inside userData (mirrors paths.assetRoots). */
function userModelsDir(): string {
  return path.join(app.getPath("userData"), "models", MODEL_DIR_NAME)
}
function userEmbeddingsDir(): string {
  return path.join(app.getPath("userData"), "embeddings")
}

function targets(): AssetTarget[] {
  const base = baseUrl()
  const tokenizerDest = path.join(userModelsDir(), "tokenizer.json")
  const list: AssetTarget[] = [
    {
      label: "embedding model",
      url: `${base}/${MODEL_ASSET}`,
      dest: path.join(userModelsDir(), "model_quantized.onnx"),
    },
    { label: "tokenizer", url: TOKENIZER_URL, dest: tokenizerDest },
    {
      label: "verse embeddings",
      url: `${base}/${VECTORS_ASSET}`,
      dest: path.join(userEmbeddingsDir(), "kjv-qwen3-0.6b.bin"),
    },
    {
      label: "verse ids",
      url: `${base}/${IDS_ASSET}`,
      dest: path.join(userEmbeddingsDir(), "kjv-qwen3-0.6b-ids.bin"),
    },
  ]
  // Tokenizer only ships on HF — no sidecar there; the rest get one.
  return list
}

let status: SemanticDownloadStatus = {
  state: "idle",
  file: null,
  bytesDone: 0,
  bytesTotal: 0,
  error: null,
}
let inFlight: Promise<SemanticDownloadStatus> | null = null

export function semanticDownloadStatus(): SemanticDownloadStatus {
  return status
}

function setStatus(patch: Partial<SemanticDownloadStatus>): void {
  status = { ...status, ...patch }
  emitAll("semantic_download_progress", status)
}

/** True when this environment should auto-download at startup. */
function shouldAutoRun(): boolean {
  if (process.env.ALEPH_SEMANTIC_DOWNLOAD === "0") return false
  if (process.env.ALEPH_SEMANTIC_DOWNLOAD === "1") return true
  return app.isPackaged
}

/**
 * Ensures the semantic assets exist, downloading whatever is missing.
 * Concurrent calls join the in-flight run. Resolves with the final status;
 * never throws (failures are reported through `state: "failed"`).
 */
export function ensureSemanticAssets(): Promise<SemanticDownloadStatus> {
  if (inFlight) return inFlight

  if (!assetsMissing()) {
    status = {
      state: "ready",
      file: null,
      bytesDone: 0,
      bytesTotal: 0,
      error: null,
    }
    return Promise.resolve(status)
  }

  info("[semantic-download] fetching semantic search assets")
  setStatus({
    state: "running",
    file: null,
    bytesDone: 0,
    bytesTotal: 0,
    error: null,
  })

  inFlight = run().finally(() => {
    inFlight = null
  })
  return inFlight
}

/** Startup hook: no-op outside packaged builds unless forced via env. */
export function initSemanticDownload(): void {
  if (!shouldAutoRun()) return
  void ensureSemanticAssets().then((s) => {
    if (s.state === "failed") {
      warn(`[semantic-download] failed: ${s.error}`)
      emitAll(
        "embedding_warning",
        "Semantic search is unavailable: its model could not be downloaded. It will retry on the next launch."
      )
    }
  })
}

async function run(): Promise<SemanticDownloadStatus> {
  try {
    for (const target of targets()) {
      if (fs.existsSync(target.dest)) continue
      await downloadAsset(target)
    }
    resetForReload()
    setStatus({ state: "ready", file: null })
    info("[semantic-download] all assets present")
    return status
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    warn("[semantic-download]", message)
    setStatus({ state: "failed", error: message, file: null })
    return status
  }
}

// ---------------------------------------------------------------------------
// Plumbing

/**
 * Electron types IncomingMessage narrowly; at runtime it is a readable
 * stream (data/end events, pause/resume for backpressure).
 */
type NetBody = Electron.IncomingMessage & NodeJS.ReadableStream

function fetchText(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const req = net.request(url)
    req.on("response", (res) => {
      const body = res as NetBody
      if (res.statusCode !== 200) {
        resolve(null)
        body.resume()
        return
      }
      const chunks: Buffer[] = []
      body.on("data", (chunk: Buffer) => chunks.push(chunk))
      body.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    })
    req.on("error", () => resolve(null))
    req.end()
  })
}

/** Streams url → temp file, verifies sha256, then atomically moves it. */
function downloadAsset(target: AssetTarget): Promise<void> {
  let expectedSha256: string | null = null
  const sidecarUrl =
    target.url === TOKENIZER_URL ? null : `${target.url}.sha256`

  async function preflight(): Promise<void> {
    if (!sidecarUrl) return
    const text = await fetchText(sidecarUrl)
    if (text === null) {
      warn(`[semantic-download] no sha256 sidecar for ${target.label}; skipping verification`)
      return
    }
    // Sidecars may be "<hex>" or "<hex>  <filename>".
    expectedSha256 = text.trim().split(/\s+/)[0]?.toLowerCase() ?? null
  }

  return preflight().then(
    () =>
      new Promise<void>((resolve, reject) => {
        fs.mkdirSync(path.dirname(target.dest), { recursive: true })
        const tempPath = `${target.dest}.part`
        const out = fs.createWriteStream(tempPath)
        const hash = crypto.createHash("sha256")

        let received = 0
        const baseDone = status.bytesDone
        let total = status.bytesTotal

        const fail = (err: Error): void => {
          out.destroy()
          try {
            fs.rmSync(tempPath, { force: true })
          } catch {
            // best effort cleanup
          }
          reject(err)
        }

        const request = net.request(target.url)
        request.on("response", (res) => {
          const body = res as NetBody
          if (res.statusCode !== 200) {
            reject(new Error(`${target.label}: HTTP ${res.statusCode} from ${target.url}`))
            body.resume()
            return
          }
          const lengthHeader = Number(res.headers["content-length"] ?? "")
          if (Number.isFinite(lengthHeader) && lengthHeader > 0) {
            total += lengthHeader
            setStatus({ bytesTotal: total })
          }
          body.on("data", (chunk: Buffer) => {
            received += chunk.length
            hash.update(chunk)
            if (!out.write(chunk)) {
              body.pause()
              out.once("drain", () => body.resume())
            }
            setStatus({
              file: target.label,
              bytesDone: baseDone + received,
              bytesTotal: total || baseDone + received,
            })
          })
          body.on("end", () => {
            out.end(() => {
              try {
                if (expectedSha256) {
                  const actual = hash.digest("hex").toLowerCase()
                  if (actual !== expectedSha256) {
                    fs.rmSync(tempPath, { force: true })
                    reject(
                      new Error(
                        `${target.label}: checksum mismatch (expected ${expectedSha256}, got ${actual})`
                      )
                    )
                    return
                  }
                }
                fs.renameSync(tempPath, target.dest)
                setStatus({ bytesDone: baseDone + received })
                info(`[semantic-download] ${target.label}: ${received} bytes → ${target.dest}`)
                resolve()
              } catch (e) {
                fail(e instanceof Error ? e : new Error(String(e)))
              }
            })
          })
          body.on("error", fail)
        })
        request.on("error", fail)
        request.end()
      })
  )
}
