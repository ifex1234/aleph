/**
 * The detection pipeline orchestrator, mirroring crates/detection/src/
 * pipeline.rs plus the verse resolution the Tauri command layer did
 * (src-tauri/src/commands/detection.rs).
 */
import { DirectDetector, type Detection } from "./detector"
import { DetectionMerger } from "./merger"
import { fuseRrf, fuseLegacy } from "./fusion"
import * as semantic from "./semantic"
import {
  getVerse,
  getVerseById,
  searchVersesBm25,
  verseExistsInTranslation,
} from "../bible"
import { displayName } from "./books"

const MIN_WORDS_FOR_VECTOR = 5

export class DetectionPipeline {
  private direct = new DirectDetector()
  private merger = new DetectionMerger()
  private activeTranslationId = 1

  setActiveTranslation(id: number): void {
    this.activeTranslationId = id
  }
  activeTranslation(): number {
    return this.activeTranslationId
  }

  directDetector(): DirectDetector {
    return this.direct
  }
  getMerger(): DetectionMerger {
    return this.merger
  }

  hasSemantic(): boolean {
    return semantic.isReady()
  }

  /** Full pipeline — used by the detect_verses command (sync, direct only). */
  process(text: string): Array<{ detection: Detection; auto_queued: boolean }> {
    const directResults = this.direct.detect(text)
    return this.merger.merge(directResults, [])
  }

  /** Instant path used on live transcript fragments. */
  processDirect(text: string): Array<{ detection: Detection; auto_queued: boolean }> {
    return this.merger.merge(this.direct.detect(text), [])
  }

  async detectAsync(text: string): Promise<Array<{ detection: Detection; auto_queued: boolean }>> {
    const directResults = this.direct.detect(text)

    let semanticResults: Detection[] = []
    if (text.split(/\s+/).length >= MIN_WORDS_FOR_VECTOR && semantic.isReady()) {
      const vec = await semantic.embed(text)
      if (vec) {
        const hits = semantic.searchIndex(vec, 5)
        semanticResults = hits
          .map((h) => {
            const row = getVerseById(h.id)
            if (!row) return null
            const d: Detection = {
              verse_ref: {
                book_number: row.book_number,
                book_name: row.book_name,
                chapter: row.chapter,
                verse_start: row.verse,
                verse_end: null,
              },
              verse_id: h.id,
              confidence: h.cosine,
              source: "semantic",
              similarity: h.cosine,
              transcript_snippet: text.slice(0, 80),
              detected_at: Date.now(),
              is_chapter_only: false,
            }
            return d
          })
          .filter((d): d is Detection => d !== null && d.verse_ref.book_number !== 0)
      }
    }

    return this.merger.merge(directResults, semanticResults)
  }

  /** Standalone hybrid search for the UI (vector ∪ FTS5 with RRF). */
  async semanticSearch(query: string, limit: number): Promise<
    Array<{
      verse_ref: string
      verse_text: string
      book_name: string
      book_number: number
      chapter: number
      verse: number
      similarity: number
      sources?: string[]
    }>
  > {
    const k = limit
    const depth = Math.max(3 * k, 30)

    // Keyword leg across all English translations.
    const bm25Hits = searchVersesBm25(query, depth)

    // Vector leg.
    let vectorRows: Array<{
      id: number
      key: { book_number: number; chapter: number; verse: number }
      cosine: number
    }> = []
    if (semantic.isReady()) {
      const vec = await semantic.embed(query)
      if (vec) {
        vectorRows = semantic
          .searchIndex(vec, depth)
          .map((h) => {
            const row = getVerseById(h.id)
            if (!row) return null
            return {
              id: h.id,
              key: { book_number: row.book_number, chapter: row.chapter, verse: row.verse },
              cosine: h.cosine,
            }
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)
      }
    }

    const fused = fuseRrf(
      vectorRows.map((r) => ({
        id: r.id,
        book_number: r.key.book_number,
        chapter: r.key.chapter,
        verse: r.key.verse,
        cosine: r.cosine,
      })),
      bm25Hits.map((h) => ({
        book_number: h.book_number,
        chapter: h.chapter,
        verse: h.verse,
        rank: -h.rank,
        phrase_match: h.phrase_match,
      })),
      k
    )

    return fused
      .map((f) => {
        const verseRow = getVerse(
          this.activeTranslationId,
          f.key.book_number,
          f.key.chapter,
          f.key.verse
        )
        const fallback = this.fallbackVerseText(f.key.book_number, f.key.chapter, f.key.verse)
        const text = verseRow?.text ?? fallback.text
        const bookName = verseRow?.book_name ?? fallback.book_name
        const refStr = `${bookName} ${f.key.chapter}:${f.key.verse}`
        const displaySimilarity =
          f.sources.includes("semantic")
            ? f.similarity
            : Math.max(0.75, 0.5)
        return {
          verse_ref: refStr,
          verse_text: text,
          book_name: bookName,
          book_number: f.key.book_number,
          chapter: f.key.chapter,
          verse: f.key.verse,
          similarity: displaySimilarity,
          sources: f.sources,
        }
      })
      .filter((r) => r.verse_text !== "")
  }

  private fallbackVerseText(bookNumber: number, chapter: number, verse: number): { text: string; book_name: string } {
    const row = getVerse(1, bookNumber, chapter, verse)
    return { text: row?.text ?? "", book_name: displayName(bookNumber) || row?.book_name || "" }
  }

  /** Resolve a Detection to the exact IPC result shape. */
  toResult(
    d: Detection,
    autoQueued: boolean,
    snippetFallback: string
  ): {
    verse_ref: string
    verse_text: string
    book_name: string
    book_number: number
    chapter: number
    verse: number
    confidence: number
    source: "direct" | "semantic"
    auto_queued: boolean
    transcript_snippet: string
    is_chapter_only: boolean
  } {
    const vr = d.verse_ref
    let verseText = ""
    let bookName = vr.book_name

    const row = getVerse(
      this.activeTranslationId,
      vr.book_number,
      vr.chapter,
      Math.max(vr.verse_start, 1)
    )
    if (row) {
      verseText = row.text
      bookName = row.book_name
    } else if (!verseExistsInTranslation(this.activeTranslationId, vr.book_number, vr.chapter, Math.max(vr.verse_start, 1))) {
      // Try KJV as a fallback so detections still show text.
      const kjv = getVerse(1, vr.book_number, vr.chapter, Math.max(vr.verse_start, 1))
      if (kjv) {
        verseText = kjv.text
        bookName = kjv.book_name
      }
    }

    const refStr = `${bookName} ${vr.chapter}:${Math.max(vr.verse_start, 1)}`
    return {
      verse_ref: refStr,
      verse_text: verseText,
      book_name: bookName,
      book_number: vr.book_number,
      chapter: vr.chapter,
      verse: Math.max(vr.verse_start, 1),
      confidence: d.confidence,
      source: d.source,
      auto_queued: autoQueued,
      transcript_snippet: d.transcript_snippet || snippetFallback,
      is_chapter_only: d.is_chapter_only,
    }
  }

  /** Live-STT FTS-only pass on finals (the Rust "FTS5-only semantic pass"). */
  ftsPass(text: string, limit = 5): Array<{ detection: Detection; auto_queued: boolean }> {
    const hits = searchVersesBm25(text, limit)
    if (hits.length === 0) return []
    const fused = fuseLegacy([], hits.map((h) => ({
      book_number: h.book_number,
      chapter: h.chapter,
      verse: h.verse,
      rank: -h.rank,
    })), limit)

    const detections: Detection[] = fused.map((f) => ({
      verse_ref: {
        book_number: f.book_number,
        book_name: displayName(f.book_number),
        chapter: f.chapter,
        verse_start: f.verse,
        verse_end: null,
      },
      verse_id: f.id,
      confidence: f.confidence,
      source: "semantic",
      transcript_snippet: text.slice(0, 80),
      detected_at: Date.now(),
      is_chapter_only: false,
    }))
    return this.merger.merge([], detections)
  }
}
