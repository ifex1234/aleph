import { DeepgramStreamClient, type SttEvent } from "./deepgram"
import { WhisperLocalClient } from "./whisper"
import { CaptureManager, type CaptureDeviceInfo, type CaptureStatusEvent } from "../audio/capture"
import { DirectDetector } from "../detection/detector"
import { DetectionMerger } from "../detection/merger"
import { ReadingMode, type ChapterChange } from "../detection/reading-mode"
import { searchVersesBm25 } from "../bible"
import {
  getChapter,
  listTranslations,
  getVerse,
} from "../bible"
import * as semantic from "../detection/semantic"
import { fuseRrf } from "../detection/fusion"
import { emitAll } from "../events"
import { info, warn, error as logError } from "../logger"
import { sharedState } from "../state"

/**
 * Transcription session manager: the Node port of src-tauri's stt.rs
 * command layer ΓÇö audio fan-in, Deepgram streaming, the sequential
 * detection worker (direct on partials; reading-mode + FTS on finals),
 * and voice translation switching.
 */

const state = sharedState()

export const capture = new CaptureManager()

type Mode = "idle" | "test" | "stt"

/** Both providers expose the same surface: onEvent/start/sendAudio/tick/stop. */
type SttClient = DeepgramStreamClient | WhisperLocalClient

let mode: Mode = "idle"
let client: SttClient | null = null
let tickTimer: NodeJS.Timeout | null = null
let testTimeout: NodeJS.Timeout | null = null
let currentGain = 1

// Shared detection state ΓÇö persists across sessions like the Rust managed
// state did, so merger cooldowns survive a restart of transcription.
const detector = new DirectDetector()
const merger = new DetectionMerger()
const readingMode = new ReadingMode()

// Sequential detection queue (the Rust worker processed jobs one at a time).
interface DetectJob {
  transcript: string
  isFinal: boolean
}
const detectQueue: DetectJob[] = []
let detecting = false
let lastPartial = ""

function isSttActive(): boolean {
  return mode === "stt"
}

function emitLevel(rms: number, peak: number): void {
  if (mode === "idle") return
  emitAll("audio_level", { rms, peak })
}

capture.setStatusHandler(onCaptureStatus)
capture.setPcmHandler(onPcm)
capture.setLevelHandler(emitLevel)

function onCaptureStatus(e: CaptureStatusEvent): void {
  if (e.event === "lost") {
    emitAll("audio_source_lost", null)
  } else if (e.event === "recovered") {
    if (mode !== "idle") emitAll("audio_source_recovered", null)
  }
}

function onPcm(samples: Buffer): void {
  if (mode !== "stt") return
  client?.sendAudio(samples)
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

export async function startAudioTest(
  deviceId?: string | null,
  gain?: number
): Promise<void> {
  if (mode === "stt") {
    throw new Error("Transcription is already running")
  }
  stopTestTimer()
  mode = "test"
  currentGain = clampGain(gain)
  await capture.start(deviceId ?? null, currentGain)
  // Self-stop after 60 s, matching the Rust audio-test behavior.
  testTimeout = setTimeout(() => {
    void stopAudioTestInternal("timeout")
  }, 60_000)
  info("[audio-test] started")
}

export async function stopAudioTest(): Promise<void> {
  await stopAudioTestInternal("stopped")
}

async function stopAudioTestInternal(reason: string): Promise<void> {
  if (mode !== "test") return
  stopTestTimer()
  mode = "idle"
  capture.stop()
  emitAll("audio_test_stopped", { reason })
  info(`[audio-test] stopped (${reason})`)
}

function stopTestTimer(): void {
  if (testTimeout) {
    clearTimeout(testTimeout)
    testTimeout = null
  }
}

export async function startTranscription(opts: {
  apiKey?: string
  deviceId?: string | null
  gain?: number
  provider?: string
}): Promise<void> {
  if (mode === "stt") {
    throw new Error("Transcription is already running")
  }

  const provider = opts.provider ?? "deepgram"

  let next: SttClient
  if (provider === "whisper") {
    // Construction validates the local setup and throws actionable
    // setup errors (binary/model missing) that surface in the UI.
    next = new WhisperLocalClient()
  } else {
    const apiKey =
      opts.apiKey && opts.apiKey.length > 0
        ? opts.apiKey
        : (process.env.DEEPGRAM_API_KEY ?? "")
    if (!apiKey) {
      throw new Error("No Deepgram API key provided")
    }
    next = new DeepgramStreamClient(apiKey)
  }

  // Starting transcription preempts an active audio test.
  if (mode === "test") await stopAudioTestInternal("stopped")

  mode = "stt"
  currentGain = clampGain(opts.gain)
  lastPartial = ""
  client = next

  client.onEvent = (e: SttEvent) => {
    switch (e.type) {
      case "connected":
        emitAll("stt_connected", null)
        break
      case "disconnected":
        emitAll("stt_disconnected", null)
        break
      case "error":
        logError(`[STT] ${e.message}`)
        emitAll("stt_error", e.message)
        break
      case "speechStarted":
        emitAll("stt_speech_started", null)
        break
      case "partial":
        if (e.transcript) handleTranscript(e.transcript, false, e.confidence)
        break
      case "final":
        if (e.transcript) handleTranscript(e.transcript, true, e.confidence)
        break
      default:
        break
    }
  }
  client.start()

  await capture.start(opts.deviceId ?? null, currentGain)

  // Keepalive/flush ticker.
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = setInterval(() => {
    client?.tick()
  }, 50)

  info(`[STT] transcription started (provider=${provider})`)
}

export async function stopTranscription(): Promise<void> {
  if (mode !== "stt") {
    throw new Error("Transcription is not running")
  }
  const stopping = client

  if (stopping instanceof WhisperLocalClient) {
    // Drain pending windows first ΓÇö mode stays "stt" so trailing speech
    // still produces transcript + detection events. Bounded by a timeout
    // so a stuck inference process can't hang the stop request.
    await Promise.race([
      stopping.stop(),
      new Promise<void>((resolve) => setTimeout(resolve, 8000)),
    ])
  } else {
    stopping?.stop()
  }

  mode = "idle"
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
  client = null
  capture.stop()
  info("[STT] transcription stopped")
}

export function isRunning(): boolean {
  return mode !== "idle"
}

export async function getAudioDevices(): Promise<CaptureDeviceInfo[]> {
  return capture.listDevices()
}

function clampGain(gain?: number): number {
  const n = typeof gain === "number" && isFinite(gain) ? gain : 1
  return Math.max(0, Math.min(2, n))
}

// ---------------------------------------------------------------------------
// Transcript handling + detection worker
// ---------------------------------------------------------------------------

function handleTranscript(transcript: string, isFinal: boolean, confidence: number): void {
  if (!isSttActive()) return

  emitAll(isFinal ? "transcript_final" : "transcript_partial", {
    text: transcript,
    is_final: isFinal,
    confidence,
  })

  checkTranslationCommand(transcript)

  // Fire-and-forget enqueue; the worker runs jobs sequentially.
  if (detectQueue.length < 16) {
    detectQueue.push({ transcript, isFinal })
    void runDetectWorker()
  } else {
    warn("[detect] queue full ΓÇö dropping transcript fragment")
  }
}

async function runDetectWorker(): Promise<void> {
  if (detecting) return
  detecting = true
  try {
    while (detectQueue.length > 0 && isSttActive()) {
      const job = detectQueue.shift()!
      await processDetectionJob(job.transcript, job.isFinal)
    }
  } finally {
    detecting = false
  }
}

async function processDetectionJob(transcript: string, isFinal: boolean): Promise<void> {
  if (!isFinal) {
    if (transcript === lastPartial) return
    lastPartial = transcript
  } else {
    lastPartial = ""
  }

  const directFound = runDirectDetection(transcript)
  if (!isFinal) return

  checkReadingMode(transcript, directFound)
  if (directFound) {
    info("[DET-SEMANTIC] Skipped ΓÇö utterance is a spoken reference")
  } else {
    await runSemanticDetection(transcript)
  }
}

/** Direct detection with persisted detector + merger. Returns high-confidence flag. */
function runDirectDetection(transcript: string): boolean {
  const directResults = detector.detect(transcript)
  if (directResults.length === 0) return false

  const hasHighConfidence = directResults.some((d) => d.confidence >= 0.9)
  const merged = merger.merge(directResults, [])
  if (merged.length === 0) return false

  const results = merged.map((m) => resolveResult(m.detection, m.auto_queued, transcript))
  const filtered = results.filter((r) => r.verse_text !== "")
  if (filtered.length === 0) return false

  for (const r of filtered) {
    info(`[DET-DIRECT] Found: ${r.verse_ref} (${Math.round(r.confidence * 100)}%)`)
  }
  emitAll("verse_detections", filtered)
  return hasHighConfidence
}

/** Resolve a Detection into the exact IPC result shape for the frontend. */
function resolveResult(
  d: import("../detection/detector").Detection,
  autoQueued: boolean,
  transcript: string
): {
  verse_ref: string
  verse_text: string
  book_name: string
  book_number: number
  chapter: number
  verse: number
  confidence: number
  source: string
  auto_queued: boolean
  transcript_snippet: string
  is_chapter_only: boolean
} {
  const vr = d.verse_ref
  let verseText = ""
  let bookName = vr.book_name

  const row = getVerse(state.activeTranslationId, vr.book_number, vr.chapter, Math.max(vr.verse_start, 1))
  if (row) {
    verseText = row.text
    bookName = row.book_name
  }

  return {
    verse_ref: `${bookName} ${vr.chapter}:${Math.max(vr.verse_start, 1)}`,
    verse_text: verseText,
    book_name: bookName,
    book_number: vr.book_number,
    chapter: vr.chapter,
    verse: Math.max(vr.verse_start, 1),
    confidence: d.confidence,
    source: d.source,
    auto_queued: autoQueued,
    transcript_snippet: d.transcript_snippet || transcript.slice(0, 100),
    is_chapter_only: d.is_chapter_only,
  }
}

/** Hybrid live pass: FTS5 Γê¬ sqlite-vec (quotes ΓåÆ John 3:16 even without book name). */
async function runSemanticDetection(transcript: string): Promise<void> {
  const fts = searchVersesBm25(transcript, 10)

  // Vector leg ΓÇö uses vec_verses inside aleph.db (<5ms) if Qwen INT8 loaded
  let vectorHits: Array<{ id: number; cosine: number }> = []
  if (semantic.isReady() && transcript.split(/\s+/).length >= 4) {
    try {
      const qvec = await semantic.embed(transcript)
      if (qvec) vectorHits = semantic.searchIndex(qvec, 10)
    } catch (e) {
      warn("[DET-SEMANTIC] vec embed failed:", e)
    }
  }

  if (fts.length === 0 && vectorHits.length === 0) return

  // If only one leg has hits, keep old FTS-only confidence mapping for speed
  if (vectorHits.length === 0) {
    const FTS5_RANK0_CONFIDENCE = 0.75
    const FTS5_CONFIDENCE_DECAY = 0.04
    const FTS5_MIN_CONFIDENCE = 0.5
    const results = fts
      .map((hit, rank) => ({ hit, rank }))
      .filter(({ hit, rank }) => {
        const c = FTS5_RANK0_CONFIDENCE - rank * FTS5_CONFIDENCE_DECAY
        hit.rank = -c
        return c >= FTS5_MIN_CONFIDENCE
      })
      .map(({ hit, rank }) => {
        const row = getVerse(state.activeTranslationId, hit.book_number, hit.chapter, hit.verse)
        return {
          verse_ref: `${hit.book_name} ${hit.chapter}:${hit.verse}`,
          verse_text: row?.text ?? "",
          book_name: hit.book_name,
          book_number: hit.book_number,
          chapter: hit.chapter,
          verse: hit.verse,
          confidence: FTS5_RANK0_CONFIDENCE - rank * FTS5_CONFIDENCE_DECAY,
          source: "semantic",
          auto_queued: false,
          transcript_snippet: transcript.slice(0, 100),
          is_chapter_only: false,
        }
      })
      .filter((r) => r.verse_text !== "")
    if (results.length === 0) return
    info(`[DET-SEMANTIC] Found ${results.length} FTS hits`)
    emitAll("verse_detections", results)
    return
  }

  // Fuse both legs via RRF ΓÇö handles paraphrases like "God loved the world so much" ΓåÆ John 3:16
  const fused = fuseRrf(
    vectorHits.map((h) => {
      const row = require("../bible").getVerseById(h.id)
      if (!row) return null
      return { id: h.id, book_number: row.book_number, chapter: row.chapter, verse: row.verse, cosine: h.cosine }
    }).filter((r): r is NonNullable<typeof r> => r !== null),
    fts.map((h) => ({ book_number: h.book_number, chapter: h.chapter, verse: h.verse, rank: -h.rank, phrase_match: h.phrase_match })),
    10
  )

  const results = fused
    .map((f) => {
      const row = getVerse(state.activeTranslationId, f.key.book_number, f.key.chapter, f.key.verse)
      const text = row?.text ?? ""
      const bookName = row?.book_name ?? ""
      if (!text) return null
      return {
        verse_ref: `${bookName} ${f.key.chapter}:${f.key.verse}`,
        verse_text: text,
        book_name: bookName,
        book_number: f.key.book_number,
        chapter: f.key.chapter,
        verse: f.key.verse,
        confidence: f.sources.includes("semantic") ? Math.max(0.6, f.similarity) : 0.75,
        source: "semantic",
        auto_queued: false,
        transcript_snippet: transcript.slice(0, 100),
        is_chapter_only: false,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (results.length === 0) return
  info(`[DET-SEMANTIC] Found ${results.length} hits (vec ${vectorHits.length} + FTS ${fts.length})`)
  emitAll("verse_detections", results)
}

// ---------------------------------------------------------------------------
// Reading mode orchestration
// ---------------------------------------------------------------------------

function checkReadingMode(transcript: string, directFound: boolean): void {
  if (directFound) {
    const recent = detector.recent()[0]
    if (recent) {
      const shouldStart = decideReadingRestart(recent.book_number, recent.chapter)
      if (shouldStart) {
        const chapterVerses = getChapter(state.activeTranslationId, recent.book_number, recent.chapter)
        if (chapterVerses.length > 0) {
          readingMode.start(
            recent.book_number,
            recent.book_name,
            recent.chapter,
            recent.verse_start > 0 ? recent.verse_start : 1,
            chapterVerses.map((v) => [v.verse, v.text])
          )
          const lower = transcript.toLowerCase()
          if (
            lower.includes("chapter") &&
            !lower.includes("next") &&
            !lower.includes("previous")
          ) {
            readingMode.setExpectingChapter()
          }
        }
      }
    }
  }

  // Don't reinterpret numbers when the utterance names another book.
  if (readingMode.isActive() || readingMode.hasVerses()) {
    const rmBook = readingMode.currentBook()
    if (rmBook !== 0) {
      const mentioned = detector.mentionedBooks(transcript)
      if (mentioned.length > 0 && !mentioned.includes(rmBook)) {
        info("[READING] Skipping ΓÇö utterance names a different book")
        return
      }
    }
  }

  // Chapter navigation commands.
  if (readingMode.isActive() || readingMode.hasVerses()) {
    const change: ChapterChange | null = readingMode.checkChapterCommand(transcript)
    if (change) {
      const chapterVerses = getChapter(
        state.activeTranslationId,
        change.book_number,
        change.new_chapter
      )
      if (chapterVerses.length > 0) {
        const startVerse = change.start_verse ?? 1
        const startText = chapterVerses.find((v) => v.verse === startVerse)?.text
        if (!startText) {
          warn(`[READING] Ignoring chapter change ΓÇö verse ${startVerse} not present`)
          return
        }
        readingMode.start(
          change.book_number,
          change.book_name,
          change.new_chapter,
          startVerse,
          chapterVerses.map((v) => [v.verse, v.text])
        )
        emitAll("reading_mode_verse", {
          book_number: change.book_number,
          book_name: change.book_name,
          chapter: change.new_chapter,
          verse: startVerse,
          verse_text: startText,
          reference: `${change.book_name} ${change.new_chapter}:${startVerse}`,
          confidence: 1.0,
        })
        return
      }
    }
  }

  // Verse advancement.
  if (readingMode.isActive() || readingMode.hasVerses()) {
    const advance = readingMode.checkTranscript(transcript)
    if (advance) emitAll("reading_mode_verse", advance)
  }
}

function decideReadingRestart(bookNumber: number, chapter: number): boolean {
  if (!readingMode.isActive() && !readingMode.hasVerses()) return true
  if (!readingMode.isActive() && readingMode.hasVerses()) return true
  const curBook = readingMode.currentBook()
  const curChapter = readingMode.currentChapter()
  if (curBook === bookNumber && curChapter === chapter) return false
  if (curBook !== bookNumber) {
    // Direct detections are always high confidence in this port.
    return true
  }
  return true // same book, different chapter ΓÇö natural progression
}

// ---------------------------------------------------------------------------
// Voice translation switching
// ---------------------------------------------------------------------------

function checkTranslationCommand(transcript: string): void {
  const abbrev = detector.detectTranslationCommand(transcript)
  if (!abbrev) return
  try {
    const translations = listTranslations()
    const t = translations.find((x) => x.abbreviation === abbrev)
    if (t) {
      state.activeTranslationId = t.id
      info(`[STT] Voice command: switched to ${abbrev} (id=${t.id})`)
      emitAll("translation_command", {
        abbreviation: abbrev,
        translation_id: t.id,
      })
    }
  } catch (e) {
    warn("[STT] translation switch failed:", e)
  }
}

// ---------------------------------------------------------------------------
// Reading-mode status commands
// ---------------------------------------------------------------------------

export function readingModeStatus(): { active: boolean; current_verse: number | null } {
  return { active: readingMode.isActive(), current_verse: readingMode.currentVerse() }
}

export function stopReadingMode(): void {
  readingMode.deactivate()
}

// Semantic status for detection_status / embedding warning banner.
export function embeddingStatusInfo(): {
  hasSemantic: boolean
  warning: string | null
} {
  const s = semantic.embeddingStatus()
  return { hasSemantic: s.available, warning: s.warning }
}
