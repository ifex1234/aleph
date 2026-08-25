/**
 * Direct Bible-reference detector, ported from
 * crates/detection/src/direct/detector.rs: filler-phrase cleaning, book
 * matching with fuzzy fallback, incomplete-reference parking, contextual
 * resolution, translation voice commands, and confidence scoring.
 */
import { BookMatcher, type BookMatch } from "./automaton"
import { fuzzyFindBooks } from "./fuzzy"
import { ReferenceContext } from "./context"
import {
  parseReference,
  parseContextual,
  tryExtractContinuation,
  extractAdjacentNumberPairs,
  type VerseRef,
} from "./parser"
import * as versification from "./versification"

export interface Detection {
  verse_ref: VerseRef
  verse_id: number | null
  confidence: number
  source: "direct" | "semantic"
  similarity?: number
  transcript_snippet: string
  detected_at: number
  is_chapter_only: boolean
}

// ---------------------------------------------------------------------------
// Chapter-count validation (MAX_CHAPTERS table)
// ---------------------------------------------------------------------------

const MAX_CHAPTERS = [
  0, 50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42,
  150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 2, 14, 4, 28,
  16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5,
  1, 1, 1, 22,
]

function isValidReference(bookNumber: number, chapter: number): boolean {
  if (bookNumber < 1 || bookNumber > 66) return false
  return chapter >= 1 && chapter <= MAX_CHAPTERS[bookNumber]
}

function clampVerseEnd(verseRef: VerseRef): void {
  if (verseRef.verse_end === null) return
  const max = versification.maxVerse(verseRef.book_number, verseRef.chapter)
  if (max !== null && (verseRef.verse_end > max || verseRef.verse_end < verseRef.verse_start)) {
    verseRef.verse_end = null
  }
}

// ---------------------------------------------------------------------------
// Transcript cleaning
// ---------------------------------------------------------------------------

const FILLER_PHRASES = [
  "please open your bibles to",
  "let us turn to",
  "let's turn to",
  "go to the book of",
  "the book of",
  "book of",
  "if you turn to",
  "if you'll turn to",
  "we will be reading from",
  "we read in",
  "the bible says in",
  "it says in",
  "as we see in",
  "as written in",
  "let's go to",
  "turn in your bibles to",
  "turn in your bible to",
]

/** Joins runs of 3+ space-separated digits ("psalm 1 1 2" → "psalm 112"). */
const SPACED_DIGITS = /\b(?:\d\s+){2,}\d\b/g

function collapseSpacedDigits(text: string): string {
  return text.replace(SPACED_DIGITS, (m) => m.replace(/\s+/g, ""))
}

export function cleanTranscript(text: string): string {
  let result = collapseSpacedDigits(text)

  for (const phrase of FILLER_PHRASES) {
    for (;;) {
      const pos = result.toLowerCase().indexOf(phrase)
      if (pos === -1) break
      result = result.slice(0, pos) + result.slice(pos + phrase.length)
    }
  }

  // "look at" only when followed by an uppercase word (likely a book name).
  for (;;) {
    const pos = result.toLowerCase().indexOf("look at")
    if (pos === -1) break
    const afterPos = pos + "look at".length
    const after = result.slice(afterPos)
    const trimmed = after.replace(/^\s+/, "")
    if (/^[A-Z]/.test(trimmed)) {
      result = result.slice(0, pos) + result.slice(afterPos)
      continue
    }
    break
  }

  return result.replace(/ {2,}/g, " ").trim()
}

// ---------------------------------------------------------------------------
// Confidence + snippets
// ---------------------------------------------------------------------------

function computeConfidence(original: VerseRef): number {
  let confidence = 0.9
  if (original.chapter > 0) confidence += 0.04
  if (original.verse_start > 0) confidence += 0.04
  if (original.book_number > 0) confidence += 0.02
  return Math.min(confidence, 1.0)
}

function extractSnippet(text: string, start: number, end: number): string {
  const snippetStartRaw = Math.max(start - 30, 0)
  const snippetEndRaw = end + 30 < text.length ? end + 30 : text.length

  let snippetStart = snippetStartRaw
  const before = text.slice(snippetStartRaw, start)
  const spaceBefore = before.lastIndexOf(" ")
  if (spaceBefore !== -1) snippetStart = snippetStartRaw + spaceBefore + 1

  let snippetEnd = snippetEndRaw
  const tail = text.slice(end, snippetEndRaw)
  const spaceAfter = tail.indexOf(" ")
  if (spaceAfter !== -1) {
    const afterSpace = end + spaceAfter + 1
    const rest = text.slice(afterSpace, snippetEndRaw)
    const nextSpace = rest.indexOf(" ")
    snippetEnd = nextSpace === -1 ? snippetEndRaw : afterSpace + nextSpace
  }
  return text.slice(snippetStart, snippetEnd)
}

// ---------------------------------------------------------------------------
// Translation voice commands
// ---------------------------------------------------------------------------

const TRANSLATION_COMMANDS: Array<[string, string]> = [
  ["give me niv", "NIV"], ["read in niv", "NIV"], ["switch to niv", "NIV"],
  ["in the niv", "NIV"], ["can i have it in niv", "NIV"], ["can i have that in niv", "NIV"],
  ["show me niv", "NIV"], ["new international version", "NIV"], ["in new international", "NIV"],
  ["give me esv", "ESV"], ["read in esv", "ESV"], ["switch to esv", "ESV"],
  ["in the esv", "ESV"], ["can i have it in esv", "ESV"], ["can i have that in esv", "ESV"],
  ["show me esv", "ESV"], ["english standard version", "ESV"], ["in english standard", "ESV"],
  ["give me nasb", "NASB"], ["read in nasb", "NASB"], ["switch to nasb", "NASB"],
  ["in the nasb", "NASB"], ["can i have it in nasb", "NASB"], ["can i have that in nasb", "NASB"],
  ["show me nasb", "NASB"], ["new american standard", "NASB"], ["in new american", "NASB"],
  ["give me nkjv", "NKJV"], ["read in nkjv", "NKJV"], ["switch to nkjv", "NKJV"],
  ["in the nkjv", "NKJV"], ["can i have it in nkjv", "NKJV"], ["can i have that in nkjv", "NKJV"],
  ["show me nkjv", "NKJV"], ["new king james", "NKJV"], ["in new king james", "NKJV"],
  ["give me nlt", "NLT"], ["read in nlt", "NLT"], ["switch to nlt", "NLT"],
  ["in the nlt", "NLT"], ["can i have it in nlt", "NLT"], ["can i have that in nlt", "NLT"],
  ["show me nlt", "NLT"], ["new living translation", "NLT"], ["in new living", "NLT"],
  ["give me kjv", "KJV"], ["read in kjv", "KJV"], ["switch to kjv", "KJV"],
  ["in the kjv", "KJV"], ["can i have it in kjv", "KJV"], ["can i have that in kjv", "KJV"],
  ["show me kjv", "KJV"], ["king james version", "KJV"], ["king james", "KJV"],
  ["in king james", "KJV"],
  ["give me amp", "AMP"], ["give me amplified", "AMP"], ["read in amplified", "AMP"],
  ["switch to amplified", "AMP"], ["in the amplified", "AMP"],
  ["can i have it in amplified", "AMP"], ["can i have that in amplified", "AMP"],
  ["can i have it in amp", "AMP"], ["can i have that in amp", "AMP"],
  ["show me amplified", "AMP"], ["show me amp", "AMP"], ["amplified bible", "AMP"],
  ["amplified version", "AMP"], ["amplified translation", "AMP"],
  ["in amplified version", "AMP"], ["in amplified translation", "AMP"],
  ["give me reina valera", "SpaRV"], ["read in reina valera", "SpaRV"],
  ["switch to reina valera", "SpaRV"], ["in reina valera", "SpaRV"],
  ["can i have it in reina valera", "SpaRV"], ["can i have that in reina valera", "SpaRV"],
  ["show me reina valera", "SpaRV"], ["give me spanish", "SpaRV"], ["read in spanish", "SpaRV"],
  ["switch to spanish", "SpaRV"], ["in spanish", "SpaRV"],
  ["can i have it in spanish", "SpaRV"], ["can i have that in spanish", "SpaRV"],
  ["spanish version", "SpaRV"], ["spanish translation", "SpaRV"],
  ["give me french", "FreJND"], ["read in french", "FreJND"], ["switch to french", "FreJND"],
  ["in french", "FreJND"], ["can i have it in french", "FreJND"],
  ["can i have that in french", "FreJND"], ["show me french", "FreJND"],
  ["french version", "FreJND"], ["french translation", "FreJND"], ["darby french", "FreJND"],
  ["give me portuguese", "PorBLivre"], ["read in portuguese", "PorBLivre"],
  ["switch to portuguese", "PorBLivre"], ["in portuguese", "PorBLivre"],
  ["can i have it in portuguese", "PorBLivre"], ["can i have that in portuguese", "PorBLivre"],
  ["show me portuguese", "PorBLivre"], ["portuguese version", "PorBLivre"],
  ["portuguese translation", "PorBLivre"], ["biblia livre", "PorBLivre"],
  ["give me message", "MSG"], ["give me the message", "MSG"], ["read in message", "MSG"],
  ["read in the message", "MSG"], ["switch to message", "MSG"], ["switch to the message", "MSG"],
  ["in the message", "MSG"], ["can i have it in message", "MSG"],
  ["can i have that in message", "MSG"], ["can i have it in the message", "MSG"],
  ["can i have that in the message", "MSG"], ["show me message", "MSG"],
  ["show me the message", "MSG"], ["message version", "MSG"], ["message translation", "MSG"],
  ["message bible", "MSG"],
  ["give me hcsb", "HCSB"], ["read in hcsb", "HCSB"], ["switch to hcsb", "HCSB"],
  ["in the hcsb", "HCSB"], ["can i have it in hcsb", "HCSB"], ["can i have that in hcsb", "HCSB"],
  ["show me hcsb", "HCSB"], ["holman christian standard", "HCSB"],
  ["holman christian", "HCSB"], ["in holman christian", "HCSB"],
  ["give me csb", "CSB"], ["read in csb", "CSB"], ["switch to csb", "CSB"],
  ["in the csb", "CSB"], ["can i have it in csb", "CSB"], ["can i have that in csb", "CSB"],
  ["show me csb", "CSB"], ["christian standard bible", "CSB"], ["christian standard", "CSB"],
  ["in christian standard", "CSB"],
  ["give me nrsv", "NRSV"], ["read in nrsv", "NRSV"], ["switch to nrsv", "NRSV"],
  ["in the nrsv", "NRSV"], ["can i have it in nrsv", "NRSV"], ["can i have that in nrsv", "NRSV"],
  ["show me nrsv", "NRSV"], ["new revised standard version", "NRSV"],
  ["new revised standard", "NRSV"], ["in new revised standard", "NRSV"],
  ["give me rsv", "RSV"], ["read in rsv", "RSV"], ["switch to rsv", "RSV"],
  ["in the rsv", "RSV"], ["can i have it in rsv", "RSV"], ["can i have that in rsv", "RSV"],
  ["show me rsv", "RSV"], ["revised standard version", "RSV"], ["revised standard", "RSV"],
  ["in revised standard", "RSV"],
  ["give me net", "NET"], ["read in net", "NET"], ["switch to net", "NET"],
  ["in the net", "NET"], ["can i have it in net", "NET"], ["can i have that in net", "NET"],
  ["show me net", "NET"], ["new english translation", "NET"], ["in new english", "NET"],
  ["give me cev", "CEV"], ["read in cev", "CEV"], ["switch to cev", "CEV"],
  ["in the cev", "CEV"], ["can i have it in cev", "CEV"], ["can i have that in cev", "CEV"],
  ["show me cev", "CEV"], ["contemporary english", "CEV"],
  ["contemporary english version", "CEV"], ["in contemporary english", "CEV"],
  ["give me gnt", "GNT"], ["give me gnb", "GNT"], ["read in gnt", "GNT"],
  ["read in gnb", "GNT"], ["switch to gnt", "GNT"], ["switch to gnb", "GNT"],
  ["in the gnt", "GNT"], ["in the gnb", "GNT"], ["can i have it in gnt", "GNT"],
  ["can i have that in gnt", "GNT"], ["show me gnt", "GNT"], ["show me gnb", "GNT"],
  ["good news", "GNT"], ["good news translation", "GNT"], ["good news bible", "GNT"],
  ["in good news", "GNT"],
]

const PREVIOUS_VERSE_PHRASES = [
  "previous verse",
  "last verse",
  "that verse again",
  "go back to that verse",
  "back to that verse",
  "the same verse",
  "repeat that verse",
]

// ---------------------------------------------------------------------------
// The detector
// ---------------------------------------------------------------------------

interface IncompleteRef {
  verse_ref: VerseRef
  timestamp: number
  chapter_is_default: boolean
}

const INCOMPLETE_REF_TIMEOUT_MS = 15_000
const CONTEXTUAL_CHAPTER_VERSE_CONFIDENCE = 0.95
const CONTEXTUAL_VERSE_ONLY_CONFIDENCE = 0.92
const CONTEXTUAL_BARE_COLON_CONFIDENCE = 0.9
const BARE_COLON_CONTEXT_WINDOW_SECS = 30

export class DirectDetector {
  private matcher = new BookMatcher()
  private context = new ReferenceContext()
  private incomplete: IncompleteRef | null = null
  private recentDetections: VerseRef[] = []

  recent(): readonly VerseRef[] {
    return this.recentDetections
  }

  /** Voice command switching translations, e.g. "read in NIV". */
  detectTranslationCommand(text: string): string | null {
    const lower = text.toLowerCase()

    for (const [pattern, abbrev] of TRANSLATION_COMMANDS) {
      if (lower.includes(pattern)) return abbrev
    }

    const words = lower.split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, ""))
    const map: Record<string, string> = {
      niv: "NIV", esv: "ESV", nasb: "NASB", nkjv: "NKJV", nlt: "NLT",
      kjv: "KJV", amp: "AMP", amplified: "AMP", sparv: "SpaRV",
      spanish: "SpaRV", frejnd: "FreJND", french: "FreJND",
      porblivre: "PorBLivre", portuguese: "PorBLivre", msg: "MSG",
      message: "MSG", csb: "CSB", hcsb: "HCSB", rsv: "RSV", nrsv: "NRSV",
      net: "NET", cev: "CEV", gnt: "GNT", gnb: "GNT",
    }
    for (const word of words) {
      const abbrev = map[word]
      if (abbrev) return abbrev
    }
    return null
  }

  /** Does the text name a full reference (book with chapter and verse)? */
  private textNamesCompleteReference(text: string): boolean {
    return this.matcher.findBooks(text).some((bm) => {
      const r = parseReference(text, bm)
      return (
        r !== null &&
        r.verse_start > 0 &&
        isValidReference(r.book_number, r.chapter) &&
        versification.isValidVerse(r.book_number, r.chapter, r.verse_start)
      )
    })
  }

  detect(text: string): Detection[] {
    const cleaned = cleanTranscript(text)
    const workText = cleaned

    const detections: Detection[] = []

    // "previous verse" style navigation.
    const prev = this.checkPreviousVerseCommand(workText)
    if (prev) return [prev]

    // Pending incomplete reference handling.
    if (this.incomplete) {
      const inc = this.incomplete
      const elapsed = Date.now() - inc.timestamp
      if (elapsed > INCOMPLETE_REF_TIMEOUT_MS) {
        this.incomplete = null
      } else if (this.textNamesCompleteReference(workText)) {
        this.incomplete = null
      } else {
        const cont = tryExtractContinuation(workText, inc.chapter_is_default)
        if (cont) {
          if (cont.kind === "chapterAndVerse" || cont.kind === "verseOnly") {
            const completed: VerseRef = { ...inc.verse_ref }
            if (cont.kind === "chapterAndVerse") completed.chapter = cont.chapter
            completed.verse_start = cont.verse
            completed.verse_end = null
            if (
              isValidReference(completed.book_number, completed.chapter) &&
              versification.isValidVerse(
                completed.book_number,
                completed.chapter,
                completed.verse_start
              )
            ) {
              clampVerseEnd(completed)
              detections.push(
                this.makeDirectDetection(completed, computeConfidence(completed), workText)
              )
              this.pushRecent(completed)
              this.context.update(completed)
              this.incomplete = null
            } else {
              this.rememberRejected(completed)
              this.incomplete = null
              const d = this.tryContextualDetection(workText)
              if (d) detections.push(d)
            }
            return detections
          }
          // chapterOnly — update chapter, keep waiting.
          const updated: VerseRef = { ...inc.verse_ref, chapter: cont.chapter }
          this.incomplete = {
            verse_ref: updated,
            timestamp: Date.now(),
            chapter_is_default: false,
          }
          this.context.update(updated)
          // Fall through: text may also contain a new book.
        }
      }
    }

    // Book matches, exact first then fuzzy fallback.
    const bookMatches = this.matcher.findBooks(workText)
    let effectiveMatches: BookMatch[]
    if (bookMatches.length === 0) {
      effectiveMatches = fuzzyFindBooks(workText).map((fm) => ({
        book_number: fm.book_number,
        book_name: fm.book_name,
        start: fm.start,
        end: fm.end,
      }))
    } else {
      effectiveMatches = bookMatches
    }

    let rejectedReference = false
    for (const bm of effectiveMatches) {
      const parsed = parseReference(workText, bm)
      if (!parsed) continue

      const resolved = this.context.resolve(parsed)

      if (resolved.book_number === 0 || resolved.chapter === 0) {
        this.context.update(parsed)
        continue
      }

      if (resolved.chapter > 0 && !isValidReference(resolved.book_number, resolved.chapter)) {
        this.rememberRejected(resolved)
        rejectedReference = true
        continue
      }

      // Chapter-only → hold for refinement.
      if (resolved.verse_start === 0) {
        const afterBook = workText.slice(bm.end).trim()
        const hasExplicitChapter =
          /^\d/.test(afterBook) || afterBook.toLowerCase().startsWith("chapter")
        this.incomplete = {
          verse_ref: resolved,
          timestamp: Date.now(),
          chapter_is_default: !hasExplicitChapter,
        }
        this.context.update(resolved)
        continue
      }

      if (
        !versification.isValidVerse(resolved.book_number, resolved.chapter, resolved.verse_start)
      ) {
        this.rememberRejected(resolved)
        rejectedReference = true
        continue
      }
      clampVerseEnd(resolved)

      this.incomplete = null

      const dup = detections.some(
        (d) =>
          d.verse_ref.book_number === resolved.book_number &&
          d.verse_ref.chapter === resolved.chapter &&
          d.verse_ref.verse_start === resolved.verse_start
      )
      if (dup) continue

      const confidence = computeConfidence(parsed)
      const snippet = extractSnippet(workText, bm.start, bm.end)

      const detection: Detection = {
        verse_ref: resolved,
        verse_id: null,
        confidence,
        source: "direct",
        transcript_snippet: snippet,
        detected_at: Date.now(),
        is_chapter_only: false,
      }

      this.pushRecent(resolved)
      detections.push(detection)
      this.context.update(resolved)
    }

    // Book-less references against recent context.
    if (detections.length === 0 && (effectiveMatches.length === 0 || rejectedReference)) {
      const d = this.tryContextualDetection(workText)
      if (d) detections.push(d)
    }

    return detections
  }

  private tryContextualDetection(text: string): Detection | null {
    const heard = this.context.lastBookHeard()
    if (!heard) return null
    const [bookNumber, bookName] = heard

    const contextual = parseContextual(text)
    if (!contextual) {
      // Adjacent number pairs fallback within the tight window.
      if (!this.context.isFresh(BARE_COLON_CONTEXT_WINDOW_SECS)) return null
      const pairs = extractAdjacentNumberPairs(text)
      let found: [number, number] | null = null
      for (let i = pairs.length - 1; i >= 0; i--) {
        const [ch, v] = pairs[i]
        if (
          isValidReference(bookNumber, ch) &&
          versification.isValidVerse(bookNumber, ch, v)
        ) {
          found = [ch, v]
          break
        }
      }
      if (!found) return null
      const vr: VerseRef = {
        book_number: bookNumber,
        book_name: bookName,
        chapter: found[0],
        verse_start: found[1],
        verse_end: null,
      }
      this.pushRecent(vr)
      this.context.update(vr)
      this.incomplete = null
      return this.makeDirectDetection(vr, CONTEXTUAL_BARE_COLON_CONFIDENCE, text)
    }

    let chapter: number
    let verse: number
    let confidence: number
    if (contextual.kind === "chapterVerse") {
      if (!contextual.keyword_anchored && !this.context.isFresh(BARE_COLON_CONTEXT_WINDOW_SECS)) {
        return null
      }
      chapter = contextual.chapter
      verse = contextual.verse
      confidence = contextual.keyword_anchored
        ? CONTEXTUAL_CHAPTER_VERSE_CONFIDENCE
        : CONTEXTUAL_BARE_COLON_CONFIDENCE
    } else if (contextual.kind === "verseOnly") {
      const lastChapter = this.context.lastChapterHeard()
      if (lastChapter === null) return null
      chapter = lastChapter
      verse = contextual.verse
      confidence = CONTEXTUAL_VERSE_ONLY_CONFIDENCE
    } else {
      // chapterOnly — park it.
      if (!isValidReference(bookNumber, contextual.chapter)) return null
      const vr: VerseRef = {
        book_number: bookNumber,
        book_name: bookName,
        chapter: contextual.chapter,
        verse_start: 0,
        verse_end: null,
      }
      this.context.update(vr)
      this.incomplete = {
        verse_ref: vr,
        timestamp: Date.now(),
        chapter_is_default: false,
      }
      return null
    }

    if (!isValidReference(bookNumber, chapter) || !versification.isValidVerse(bookNumber, chapter, verse)) {
      return null
    }

    const vr: VerseRef = {
      book_number: bookNumber,
      book_name: bookName,
      chapter,
      verse_start: verse,
      verse_end: null,
    }
    this.pushRecent(vr)
    this.context.update(vr)
    this.incomplete = null
    return this.makeDirectDetection(vr, confidence, text)
  }

  /** Books explicitly named in the text (after cleaning). */
  mentionedBooks(text: string): number[] {
    const cleaned = cleanTranscript(text)
    return this.matcher.findBooks(cleaned).map((m) => m.book_number)
  }

  private rememberRejected(verseRef: VerseRef): void {
    const ctxRef: VerseRef = { ...verseRef, verse_start: 0, verse_end: null }
    if (!isValidReference(ctxRef.book_number, ctxRef.chapter)) {
      ctxRef.chapter = 0
    }
    this.context.update(ctxRef)
  }

  private checkPreviousVerseCommand(text: string): Detection | null {
    const lower = text.toLowerCase()
    for (const phrase of PREVIOUS_VERSE_PHRASES) {
      if (lower.includes(phrase)) {
        const prevRef = this.recentDetections[0]
        if (prevRef) {
          return {
            verse_ref: prevRef,
            verse_id: null,
            confidence: 0.92,
            source: "direct",
            transcript_snippet: text,
            detected_at: Date.now(),
            is_chapter_only: false,
          }
        }
      }
    }
    return null
  }

  private pushRecent(verseRef: VerseRef): void {
    const front = this.recentDetections[0]
    if (
      front &&
      front.book_number === verseRef.book_number &&
      front.chapter === verseRef.chapter &&
      front.verse_start === verseRef.verse_start
    ) {
      return
    }
    this.recentDetections.unshift({ ...verseRef })
    if (this.recentDetections.length > 5) this.recentDetections.pop()
  }

  private makeDirectDetection(
    verseRef: VerseRef,
    confidence: number,
    text: string
  ): Detection {
    return {
      verse_ref: verseRef,
      verse_id: null,
      confidence,
      source: "direct",
      transcript_snippet: extractSnippet(text, 0, Math.min(text.length, text.length)),
      detected_at: Date.now(),
      is_chapter_only: false,
    }
  }
}
