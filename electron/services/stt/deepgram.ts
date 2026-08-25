import WebSocket from "ws"
import { CORE_KEYTERMS, bibleKeyterms } from "./keyterms"
import { info, warn, error as logError } from "../logger"

/**
 * Deepgram streaming STT client, ported from crates/stt/src/deepgram.rs:
 * same URL parameters, keyterm boosting, keepalives, batched binary audio,
 * reconnect ladder, and message parsing.
 */

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_MS = 1000
const BATCH_SAMPLES = 4000 // 250 ms @ 16 kHz
const KEEPALIVE_INTERVAL_MS = 5000

export interface TranscriptWords {
  word: string
  start: number
  end: number
  confidence: number
  punctuated_word?: string
}

export type SttEvent =
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "error"; message: string }
  | { type: "speechStarted" }
  | { type: "utteranceEnd" }
  | {
      type: "partial"
      transcript: string
      words: TranscriptWords[]
      confidence: number
    }
  | {
      type: "final"
      transcript: string
      words: TranscriptWords[]
      confidence: number
      speechFinal: boolean
    }

function buildUrl(apiKey: string, language?: string): string {
  const params = new URLSearchParams()
  params.set("model", "nova-3")
  params.set("encoding", "linear16")
  params.set("sample_rate", "16000")
  params.set("channels", "1")
  params.set("numerals", "true")
  params.set("punctuate", "true")
  params.set("smart_format", "true")
  params.set("interim_results", "true")
  params.set("endpointing", "300")
  params.set("utterance_end_ms", "1000")
  params.set("vad_events", "true")
  if (language && language !== "auto") params.set("language", language)

  const terms = [...new Set([...CORE_KEYTERMS, ...bibleKeyterms()])].slice(0, 100)
  const base = params.toString()
  const extra = terms.map((t) => `keyterm=${encodeURIComponent(t)}`).join("&")
  void apiKey
  return `wss://api.deepgram.com/v1/listen?${base}${extra ? `&${extra}` : ""}`
}

interface DeepgramResultWord {
  word: string
  start: number
  end: number
  confidence: number
  punctuated_word?: string
}

interface DeepgramMessage {
  type: string
  is_final?: boolean
  speech_final?: boolean
  channel?: {
    alternatives?: Array<{
      transcript: string
      confidence: number
      words?: DeepgramResultWord[]
    }>
  }
}

export class DeepgramStreamClient {
  private ws: WebSocket | null = null
  private apiKey: string
  private language: string | undefined
  private batch: Buffer[] = []
  private batchLen = 0
  private lastSendAt = Date.now()
  private lastKeepAliveAt = 0
  private closed = false
  private reconnectAttempts = 0

  onEvent: (e: SttEvent) => void = () => {}

  constructor(apiKey: string, language?: string) {
    this.apiKey = apiKey
    this.language = language
  }

  start(): void {
    this.closed = false
    this.connect()
  }

  private connect(): void {
    if (this.closed) return
    info("[STT-deepgram] connecting...")
    const ws = new WebSocket(buildUrl(this.apiKey, this.language), {
      headers: { Authorization: `Token ${this.apiKey}` },
    })
    this.ws = ws

    ws.on("open", () => {
      this.reconnectAttempts = 0
      info("[STT-deepgram] connected")
      this.onEvent({ type: "connected" })
    })

    ws.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
      if (isBinary) return
      try {
        this.handleMessage(JSON.parse(data.toString()) as DeepgramMessage)
      } catch (e) {
        warn("[STT-deepgram] bad message:", e)
      }
    })

    ws.on("error", (err: Error) => {
      logError(`[STT-deepgram] error: ${err.message}`)
    })

    ws.on("close", () => {
      if (this.closed) return
      info("[STT-deepgram] disconnected")
      this.onEvent({ type: "disconnected" })
      this.reconnectAttempts++
      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        this.onEvent({
          type: "error",
          message: "Max reconnection attempts reached",
        })
        return
      }
      setTimeout(() => this.connect(), RECONNECT_DELAY_MS)
    })
  }

  private handleMessage(msg: DeepgramMessage): void {
    if (msg.type === "UtteranceEnd") {
      this.onEvent({ type: "utteranceEnd" })
      return
    }
    if (msg.type === "SpeechStarted") {
      this.onEvent({ type: "speechStarted" })
      return
    }
    if (msg.type !== "Results") return

    const alt = msg.channel?.alternatives?.[0]
    if (!alt) return
    const words: TranscriptWords[] = (alt.words ?? []).map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      punctuated_word: w.punctuated_word,
    }))

    if (msg.is_final) {
      this.onEvent({
        type: "final",
        transcript: alt.transcript,
        words,
        confidence: alt.confidence ?? 0,
        speechFinal: msg.speech_final ?? false,
      })
    } else {
      this.onEvent({
        type: "partial",
        transcript: alt.transcript,
        words,
        confidence: alt.confidence ?? 0,
      })
    }
  }

  /** Queue PCM (16-bit LE mono @16 kHz) and flush when a batch is full. */
  sendAudio(samples: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.batch.push(samples)
    this.batchLen += samples.length
    if (this.batchLen >= BATCH_SAMPLES * 2) {
      this.flush()
    }
  }

  /** Called periodically to flush partial batches and send keepalives. */
  tick(): void {
    const now = Date.now()
    if (this.batchLen > 0 && now - this.lastSendAt >= 50) this.flush()
    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      now - Math.max(this.lastSendAt, this.lastKeepAliveAt) >= KEEPALIVE_INTERVAL_MS
    ) {
      try {
        this.ws.send(JSON.stringify({ type: "KeepAlive" }))
        this.lastKeepAliveAt = now
      } catch {
        // Socket closing — the close handler owns reconnection.
      }
    }
  }

  private flush(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.batchLen === 0) return
    const merged = Buffer.concat(this.batch, this.batchLen)
    this.batch = []
    this.batchLen = 0
    this.lastSendAt = Date.now()
    try {
      this.ws.send(merged)
    } catch (e) {
      warn("[STT-deepgram] send failed:", e)
    }
  }

  stop(): void {
    if (this.closed) return
    this.closed = true
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "CloseStream" }))
        this.ws.close()
      } else {
        this.ws?.terminate()
      }
    } catch {
      // Best effort.
    }
    this.ws = null
  }
}
