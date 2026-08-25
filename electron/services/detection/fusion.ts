/**
 * Reciprocal Rank Fusion of vector hits and BM25 keyword hits.
 * Ported from crates/detection/src/fusion.rs.
 */

export interface VectorHit {
  verseId: number
  cosine: number
}
export interface FtsHit {
  verseKey: { book_number: number; chapter: number; verse: number }
  rank: number
  phrase_match: boolean
}

const RRF_K = 60.0
const VECTOR_SIMILARITY_FLOOR = 0.4
const PHRASE_PRIORITY_BASE = 10.0
const FTS5_RANK0_CONFIDENCE = 0.75
const FTS5_CONFIDENCE_DECAY = 0.04
const FTS5_MIN_CONFIDENCE = 0.5

export interface FusedResult {
  verse_id: number | null
  key: { book_number: number; chapter: number; verse: number }
  similarity: number
  sources: string[]
}

/** Display/command-side fusion (RRF). Returns fused results sorted by score. */
export function fuseRrf(
  vectorHits: Array<{ id: number; book_number: number; chapter: number; verse: number; cosine: number }>,
  ftsCandidates: Array<{ book_number: number; chapter: number; verse: number; rank: number; phrase_match: boolean }>,
  limit: number
): FusedResult[] {
  const scores = new Map<
    string,
    {
      score: number
      verseId: number | null
      key: { book_number: number; chapter: number; verse: number }
      cosine: number | null
      fromFts: boolean
      bestPhraseRank: number | null
    }
  >()

  // Vector leg — below-floor candidates don't consume ranks.
  let vectorRank = 0
  for (const hit of vectorHits) {
    if (hit.cosine < VECTOR_SIMILARITY_FLOOR) continue
    const key = `${hit.book_number}:${hit.chapter}:${hit.verse}`
    let entry = scores.get(key)
    if (!entry) {
      entry = {
        score: 0,
        verseId: hit.id,
        key: { book_number: hit.book_number, chapter: hit.chapter, verse: hit.verse },
        cosine: null,
        fromFts: false,
        bestPhraseRank: null,
      }
      scores.set(key, entry)
    }
    entry.score += 1 / (RRF_K + vectorRank + 1)
    if (entry.cosine === null || hit.cosine > entry.cosine) entry.cosine = hit.cosine
    if (entry.verseId === null) entry.verseId = hit.id
    vectorRank++
  }

  // Keyword leg.
  for (const cand of ftsCandidates) {
    const key = `${cand.book_number}:${cand.chapter}:${cand.verse}`
    let entry = scores.get(key)
    if (!entry) {
      entry = {
        score: 0,
        verseId: null,
        key: { book_number: cand.book_number, chapter: cand.chapter, verse: cand.verse },
        cosine: null,
        fromFts: false,
        bestPhraseRank: null,
      }
      scores.set(key, entry)
    }
    if (!entry.fromFts) {
      entry.fromFts = true
      entry.score += 1 / (RRF_K + cand.rank + 1)
      if (cand.phrase_match) {
        entry.bestPhraseRank =
          entry.bestPhraseRank === null ? cand.rank : Math.min(entry.bestPhraseRank, cand.rank)
      }
    } else if (cand.phrase_match) {
      entry.bestPhraseRank =
        entry.bestPhraseRank === null ? cand.rank : Math.min(entry.bestPhraseRank, cand.rank)
    }
  }

  for (const entry of scores.values()) {
    if (entry.bestPhraseRank !== null) {
      entry.score += PHRASE_PRIORITY_BASE - entry.bestPhraseRank * 0.1
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([, entry]) => ({
      verse_id: entry.verseId,
      key: entry.key,
      similarity:
        entry.cosine !== null
          ? entry.cosine
          : Math.max(FTS5_RANK0_CONFIDENCE - 0 * FTS5_CONFIDENCE_DECAY, FTS5_MIN_CONFIDENCE),
      sources: [
        ...(entry.cosine !== null ? ["semantic"] : []),
        ...(entry.fromFts ? ["keyword"] : []),
      ],
    }))
}

/**
 * Live-STT fusion ladder: real cosines kept as-is; keyword-only keys get the
 * decaying confidence floor. Ported from fusion.rs `fuse`.
 */
export function fuseLegacy(
  vectorHits: Array<{ id: number; book_number: number; chapter: number; verse: number; cosine: number }>,
  ftsCandidates: Array<{ book_number: number; chapter: number; verse: number; rank: number }>,
  limit: number
): Array<{ id: number; book_number: number; chapter: number; verse: number; confidence: number }> {
  const byKey = new Map<
    string,
    { id: number; book_number: number; chapter: number; verse: number; confidence: number }
  >()

  for (const hit of vectorHits) {
    if (hit.cosine < VECTOR_SIMILARITY_FLOOR) continue
    const key = `${hit.book_number}:${hit.chapter}:${hit.verse}`
    byKey.set(key, {
      id: hit.id,
      book_number: hit.book_number,
      chapter: hit.chapter,
      verse: hit.verse,
      confidence: hit.cosine,
    })
  }

  for (const cand of ftsCandidates) {
    const key = `${cand.book_number}:${cand.chapter}:${cand.verse}`
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: null as unknown as number,
        book_number: cand.book_number,
        chapter: cand.chapter,
        verse: cand.verse,
        confidence: Math.max(
          FTS5_RANK0_CONFIDENCE - cand.rank * FTS5_CONFIDENCE_DECAY,
          FTS5_MIN_CONFIDENCE
        ),
      })
    }
  }

  return [...byKey.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}
