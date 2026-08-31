import Database from "better-sqlite3"
import fs from "node:fs"
import { bibleDbPath } from "./paths"
import { error, info, warn } from "./logger"

/**
 * Read-only access to the bundled bible database (same file and schema as
 * the Rust backend used). Opened with immutable=1 so no WAL sidecars appear
 * next to a signed bundle.
 */

// ---------------------------------------------------------------------------
// Row shapes — identical to the serde structs the frontend expects.
// ---------------------------------------------------------------------------

export interface Translation {
  id: number
  abbreviation: string
  title: string
  language: string
  is_copyrighted: boolean
  is_downloaded: boolean
}

export interface Book {
  id: number
  translation_id: number
  book_number: number
  name: string
  abbreviation: string
  testament: string
}

export interface Verse {
  id: number
  translation_id: number
  book_number: number
  book_name: string
  book_abbreviation: string
  chapter: number
  verse: number
  text: string
}

export interface CrossReference {
  from_ref: string
  to_ref: string
  votes: number
}

export interface VerseSearchRow {
  book_number: number
  book_name: string
  chapter: number
  verse: number
  text: string
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

let db: Database.Database | null = null
let openFailed = false

let vecLoaded = false

function conn(): Database.Database | null {
  if (db) return db
  if (openFailed) return null
  const file = bibleDbPath()
  if (!fs.existsSync(file)) {
    warn(
      `[bible] database not found at ${file} — run "npm run download:bible-data && npm run build:bible" to build it`
    )
    openFailed = true
    return null
  }
  try {
    db = new Database(file, { readonly: true })
    db.pragma("query_only = 1")
    db.pragma("mmap_size = 268435456")
    // Load sqlite-vec extension if available (optional — FTS5 works without it)
    try {
      const vec = require("sqlite-vec")
      vec.load(db)
      vecLoaded = true
      info(`[bible] sqlite-vec ${ (db.prepare("SELECT vec_version()").get() as any)["vec_version()"] }`)
    } catch {
      // vec table queries will no-op; FTS5 still works
    }
    info(`[bible] opened ${file}`)
    return db
  } catch (e) {
    error(`[bible] failed to open ${file}:`, e)
    openFailed = true
    return null
  }
}

/** All queries no-op with empty results when the DB is unavailable. */
function requireConn(): Database.Database | null {
  const c = conn()
  if (!c) return null
  return c
}

export function closeDb(): void {
  try {
    db?.close()
  } catch (e) {
    error("[bible] close failed", e)
  }
  db = null
}

// ---------------------------------------------------------------------------
// Plain lookups
// ---------------------------------------------------------------------------

const VERSE_COLUMNS =
  "v.id, v.translation_id, v.book_number, v.book_name, v.book_abbreviation, v.chapter, v.verse, v.text"

export function listTranslations(): Translation[] {
  const c = requireConn()
  if (!c) return []
  return c
    .prepare(
      "SELECT id, abbreviation, title, language, is_copyrighted, is_downloaded FROM translations"
    )
    .all() as Translation[]
}

export function listBooks(translationId: number): Book[] {
  const c = requireConn()
  if (!c) return []
  return c
    .prepare(
      "SELECT id, translation_id, book_number, name, abbreviation, testament FROM books WHERE translation_id = ? ORDER BY book_number"
    )
    .all(translationId) as Book[]
}

export function getChapter(
  translationId: number,
  bookNumber: number,
  chapter: number
): Verse[] {
  const c = requireConn()
  if (!c) return []
  return c
    .prepare(
      `SELECT ${VERSE_COLUMNS} FROM verses v
       WHERE v.translation_id = ? AND v.book_number = ? AND v.chapter = ?
       ORDER BY v.verse`
    )
    .all(translationId, bookNumber, chapter) as Verse[]
}

export function getVerse(
  translationId: number,
  bookNumber: number,
  chapter: number,
  verse: number
): Verse | null {
  const c = requireConn()
  if (!c) return null
  const row = c
    .prepare(
      `SELECT ${VERSE_COLUMNS} FROM verses v
       WHERE v.translation_id = ? AND v.book_number = ? AND v.chapter = ? AND v.verse = ?
       LIMIT 1`
    )
    .get(translationId, bookNumber, chapter, verse)
  return (row as Verse | undefined) ?? null
}

export function getTranslationVersesForSearch(
  translationId: number
): VerseSearchRow[] {
  const c = requireConn()
  if (!c) return []
  return c
    .prepare(
      `SELECT book_number, book_name, chapter, verse, text FROM verses
       WHERE translation_id = ? ORDER BY book_number, chapter, verse`
    )
    .all(translationId) as VerseSearchRow[]
}

/** Row by primary key — used to resolve embedding-index ids. */
export function getVerseById(id: number): Verse | null {
  const c = requireConn()
  if (!c) return null
  const row = c
    .prepare(`SELECT ${VERSE_COLUMNS} FROM verses v WHERE v.id = ? LIMIT 1`)
    .get(id)
  return (row as Verse | undefined) ?? null
}

export function getCrossReferences(
  bookNumber: number,
  chapter: number,
  verse: number
): CrossReference[] {
  const key = `${bookNumber}:${chapter}:${verse}`
  const c = requireConn()
  if (!c) return []
  return c
    .prepare("SELECT from_ref, to_ref, votes FROM cross_references WHERE from_ref = ? ORDER BY votes DESC")
    .all(key) as CrossReference[]
}

/** Simple in-translation full-text search (the panel's quick search). */
export function searchVerses(
  query: string,
  translationId: number,
  limit: number
): Verse[] {
  const cleaned = query.replace(/["'()*:^]/g, " ").trim()
  if (!cleaned) return []
  const c = requireConn()
  if (!c) return []
  return c
    .prepare(
      `SELECT ${VERSE_COLUMNS} FROM verses_fts fts
       JOIN verses v ON v.rowid = fts.rowid
       WHERE verses_fts MATCH ? AND v.translation_id = ?
       LIMIT ?`
    )
    .all(cleaned, translationId, limit) as Verse[]
}

/** Does this reference exist in the given translation? Used by detection. */
export function verseExistsInTranslation(
  translationId: number,
  bookNumber: number,
  chapter: number,
  verse: number
): boolean {
  const c = requireConn()
  if (!c) return false
  return (
    c
      .prepare(
        "SELECT 1 FROM verses WHERE translation_id = ? AND book_number = ? AND chapter = ? AND verse = ? LIMIT 1"
      )
      .get(translationId, bookNumber, chapter, verse) !== undefined
  )
}

// ---------------------------------------------------------------------------
// Ranked BM25 search (three tiers), ported from crates/bible/src/search.rs.
// Powers the keyword leg of semantic_search.
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","it","be","are","was","were","been","has","have","had","do",
  "does","did","that","this","these","those","he","she","we","they","you",
  "i","me","him","her","us","them","my","his","its","our","your","their",
  "so","if","as","am","about","into","than","just","also","very","like","even",
])

const TRANSLATION_FANOUT = 10

function cleanWord(word: string): string {
  return word.replace(/[^a-zA-Z0-9']/g, "")
}

export interface Bm25Hit extends VerseSearchRow {
  rank: number
  phrase_match: boolean
}

function runFtsQuery(match: string, limit: number, language: string): Array<{ rank: number; book_number: number; book_name: string; chapter: number; verse: number }> {
  const innerLimit = limit * TRANSLATION_FANOUT
  const c = requireConn()
  if (!c) return []
  return c
    .prepare(
      `WITH ranked AS MATERIALIZED (
         SELECT bm25(verses_fts) AS rank, v.book_number, v.book_name, v.chapter, v.verse
         FROM verses_fts fts
         JOIN verses v ON v.rowid = fts.rowid
         JOIN translations t ON v.translation_id = t.id
         WHERE verses_fts MATCH ?1 AND t.language = ?4
         ORDER BY rank LIMIT ?3
       )
       SELECT MIN(rank) AS rank, book_number, book_name, chapter, verse
       FROM ranked GROUP BY book_number, chapter, verse ORDER BY rank LIMIT ?2`
    )
    .all(match, limit, innerLimit, language) as Array<{
    rank: number
    book_number: number
    book_name: string
    chapter: number
    verse: number
  }>
}

function tierHits(raw: string[], limit: number, language: string): Bm25Hit[] {
  return runFtsQuery(raw.join(" "), limit, language).map((r) => ({
    text: "",
    ...r,
    phrase_match: false,
  }))
}

/**
 * The exact three-tier ladder: phrase → AND of significant words → OR of
 * rare words, de-duplicated per (book, chapter, verse) keeping the earliest
 * (best-tier) occurrence.
 */
export function searchVersesBm25(query: string, limit: number): Bm25Hit[] {
  if (!conn()) return []

  // Tier 1: the whole input as a quoted phrase.
  const phrase = query
    .replace(/[^a-zA-Z0-9 '’]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const results: Bm25Hit[] = phrase
    ? runFtsQuery(`"${phrase}"`, limit * 4, "en").map((r) => ({
        text: "",
        ...r,
        phrase_match: true,
      }))
    : []

  // Tier 2: significant words ANDed together.
  if (results.length < limit) {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .map(cleanWord)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
      .slice(0, 12)
    if (words.length > 0) {
      results.push(...tierHits(words, limit * 4, "en"))
    }
  }

  // Tier 3: rare words ORed together.
  if (results.length < limit) {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .map(cleanWord)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
      .slice(0, 10)
      .map((w) => `"${w}"`)
    if (words.length > 0) {
      results.push(...tierHits(words, limit * 4, "en"))
    }
  }

  // Dedupe on (book, chapter, verse); first occurrence wins (tier priority),
  // but upgrade phrase_match if any duplicate had it.
  const seen = new Map<string, Bm25Hit>()
  for (const hit of results) {
    const key = `${hit.book_number}:${hit.chapter}:${hit.verse}`
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, hit)
    } else if (!existing.phrase_match && hit.phrase_match) {
      existing.phrase_match = true
    }
  }
  return [...seen.values()]
}

// ---------------------------------------------------------------------------
// sqlite-vec vector search — replaces brute-force flat .bin scan.
// Uses the vec_verses virtual table created by data/build-vec-index.ts
// ---------------------------------------------------------------------------

export function hasVecIndex(): boolean {
  const c = conn()
  if (!c || !vecLoaded) return false
  try {
    c.prepare("SELECT COUNT(*) as c FROM vec_verses LIMIT 1").get()
    return true
  } catch {
    return false
  }
}

export interface VecHit {
  verse_id: number
  distance: number
}

/**
 * Cosine search via sqlite-vec. queryVec must be L2-normalized, same dim as vec_verses.
 * Returns verse_id + distance (0 = identical, 2 = opposite for cosine).
 */
export function searchVecVerses(queryVec: Float32Array, k: number): VecHit[] {
  const c = requireConn()
  if (!c || !vecLoaded) return []
  try {
    // vec0: embedding MATCH ? + k parameter + ORDER BY distance
    return c
      .prepare("SELECT verse_id, distance FROM vec_verses WHERE embedding MATCH ? AND k = ? ORDER BY distance LIMIT ?")
      .all(queryVec, k, k) as VecHit[]
  } catch (e) {
    // Fallback to legacy MATCH without k (older vec builds)
    try {
      return c
        .prepare("SELECT verse_id, distance FROM vec_verses WHERE embedding MATCH ? ORDER BY distance LIMIT ?")
        .all(queryVec, k) as VecHit[]
    } catch {
      warn("[bible] vec search failed:", e)
      return []
    }
  }
}

export function vecIndexStats(): { count: number; dim: number } | null {
  const c = requireConn()
  if (!c || !vecLoaded) return null
  try {
    const row = c.prepare("SELECT COUNT(*) as c FROM vec_verses").get() as { c: number }
    // Dim via vec0 metadata — probe one row
    const sample = c.prepare("SELECT embedding FROM vec_verses LIMIT 1").get() as any
    const dim = sample?.embedding?.length ?? 0
    return { count: row.c, dim }
  } catch {
    return null
  }
}
