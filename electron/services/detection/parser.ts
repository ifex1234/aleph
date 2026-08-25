/**
 * Reference grammar, ported from crates/detection/src/direct/parser.rs.
 * Tokenizes the text after a book match and extracts chapter:verse in
 * every spoken form the Rust version handled.
 */
import type { BookMatch } from "./automaton"
import { isValidVerse } from "./versification"

export interface VerseRef {
  book_number: number
  book_name: string
  chapter: number
  verse_start: number
  verse_end: number | null
}

export type Continuation =
  | { kind: "chapterAndVerse"; chapter: number; verse: number }
  | { kind: "chapterOnly"; chapter: number }
  | { kind: "verseOnly"; verse: number }

export type ContextualRef =
  | { kind: "chapterVerse"; chapter: number; verse: number; keyword_anchored: boolean }
  | { kind: "verseOnly"; verse: number }
  | { kind: "chapterOnly"; chapter: number }

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { t: "word"; w: string }
  | { t: "number"; n: number }
  | { t: "colon" }
  | { t: "dash" }

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === ":") {
      tokens.push({ t: "colon" })
      i++
      continue
    }
    if (ch === "-" || ch === "\u2013" || ch === "\u2014") {
      tokens.push({ t: "dash" })
      i++
      continue
    }
    if (/[0-9]/.test(ch)) {
      let num = ""
      while (i < text.length && /[0-9]/.test(text[i])) {
        num += text[i]
        i++
      }
      const n = Number.parseInt(num, 10)
      if (!Number.isNaN(n) && n <= 2147483647) tokens.push({ t: "number", n })
      continue
    }
    if (/\p{L}/u.test(ch)) {
      let word = ""
      while (i < text.length && /\p{L}/u.test(text[i])) {
        word += text[i]
        i++
      }
      tokens.push({ t: "word", w: word.toLowerCase() })
      continue
    }
    i++
  }
  return tokens
}

// ---------------------------------------------------------------------------
// Spoken numbers
// ---------------------------------------------------------------------------

const SPOKEN_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100,
}

export function parseSpokenNumber(word: string): number | null {
  return SPOKEN_NUMBERS[word.toLowerCase()] ?? null
}

/** Consume a number at position `start` — digits or compound spoken words. */
function consumeNumberAt(tokens: Token[], start: number): [number, number] | null {
  if (start >= tokens.length) return null
  const tok = tokens[start]

  if (tok.t === "number") return [tok.n, start + 1]

  if (tok.t === "word") {
    const n = parseSpokenNumber(tok.w)
    if (n === null) return null

    // Tens followed by ones ("thirty two").
    if (n >= 20 && n % 10 === 0 && start + 1 < tokens.length) {
      const next = tokens[start + 1]
      if (next.t === "word") {
        const ones = parseSpokenNumber(next.w)
        if (ones !== null && ones >= 1 && ones <= 9) {
          const combined = n + ones
          // Unusual trailing "hundred" after tens+ones — skip it.
          if (
            start + 2 < tokens.length &&
            tokens[start + 2].t === "word" &&
            (tokens[start + 2] as { w: string }).w === "hundred"
          ) {
            return [combined, start + 2]
          }
          return [combined, start + 2]
        }
      }
    }

    // "N hundred [and M]"
    if (n >= 1 && n <= 9 && start + 1 < tokens.length) {
      const next = tokens[start + 1]
      if (next.t === "word" && next.w === "hundred") {
        const base = n * 100
        if (start + 2 < tokens.length) {
          const after = tokens[start + 2]
          if (after.t === "word") {
            const skip = after.w === "and" ? 1 : 0
            const rest = consumeNumberAt(tokens, start + 2 + skip)
            if (rest && rest[0] < 100) return [base + rest[0], rest[1]]
          }
          if (after.t === "number" && after.n < 100) {
            return [base + after.n, start + 3]
          }
        }
        return [base, start + 2]
      }
    }

    return [n, start + 1]
  }
  return null
}

function consumeNumber(tokens: Token[], start: number): [number, number] | null {
  if (start >= tokens.length) return null
  return consumeNumberAt(tokens, start)
}

function tokenToNumber(token: Token): number | null {
  if (token.t === "number") return token.n
  if (token.t === "word") return parseSpokenNumber(token.w)
  return null
}

const isWord = (tok: Token | undefined, ...words: string[]): boolean =>
  tok?.t === "word" && words.includes(tok.w)

// ---------------------------------------------------------------------------
// Pattern attempts (same order as parse_reference)
// ---------------------------------------------------------------------------

export function parseReference(text: string, bookMatch: BookMatch): VerseRef | null {
  const after = text.slice(bookMatch.end)
  const tokens = tokenize(after.trimStart())

  // Book name only → chapter-only, held for refinement.
  if (tokens.length === 0) {
    return ref(bookMatch, 1, 0)
  }

  return (
    tryColonPattern(tokens, bookMatch) ??
    tryCorrectionPattern(tokens, bookMatch) ??
    tryChapterVerseSpoken(tokens, bookMatch) ??
    tryVerseOnlyPattern(tokens, bookMatch) ??
    trySplitChapterVersePattern(tokens, bookMatch) ??
    tryNumberVersePattern(tokens, bookMatch) ??
    trySpokenNumbers(tokens, bookMatch) ??
    tryTwoNumbers(tokens, bookMatch) ??
    (() => {
      const chapter = tokenToNumber(tokens[0])
      return chapter !== null ? ref(bookMatch, chapter, 0) : null
    })()
  )
}

function ref(
  bm: BookMatch,
  chapter: number,
  verseStart: number,
  verseEnd: number | null = null
): VerseRef {
  return {
    book_number: bm.book_number,
    book_name: bm.book_name,
    chapter,
    verse_start: verseStart,
    verse_end: verseEnd,
  }
}

function tryColonPattern(tokens: Token[], bm: BookMatch): VerseRef | null {
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.t !== "number") continue
    if (i + 2 < tokens.length && tokens[i + 1].t === "colon") {
      const verseTok = tokens[i + 2]
      if (verseTok.t === "number") {
        let verseEnd: number | null = null
        if (
          i + 4 < tokens.length &&
          tokens[i + 3].t === "dash" &&
          tokens[i + 4].t === "number"
        ) {
          verseEnd = (tokens[i + 4] as { n: number }).n
        }
        return ref(bm, tok.n, verseTok.n, verseEnd)
      }
    }
  }
  return null
}

function tryCorrectionPattern(tokens: Token[], bm: BookMatch): VerseRef | null {
  const correctionWords = ["sorry", "rather", "meant", "mean"]
  let correctionIdx = -1
  for (let i = 0; i < tokens.length; i++) {
    if (isWord(tokens[i], ...correctionWords)) {
      correctionIdx = i
      break
    }
  }
  if (correctionIdx === -1) return null

  let initialChapter: number | null = null
  let initialVerse: number | null = null

  for (let i = 0; i < correctionIdx; i++) {
    if (tokens[i].t === "word") {
      const w = (tokens[i] as { w: string }).w
      if (w === "chapter") {
        const got = consumeNumber(tokens, i + 1)
        if (got) initialChapter = got[0]
      } else if (w === "verse" || w === "verses") {
        const got = consumeNumber(tokens, i + 1)
        if (got) initialVerse = got[0]
      }
    }
  }

  let correctedChapter: number | null = null
  let correctedVerse: number | null = null

  for (let i = correctionIdx + 1; i < tokens.length; i++) {
    if (tokens[i].t === "word") {
      const w = (tokens[i] as { w: string }).w
      if (w === "chapter") {
        const got = consumeNumber(tokens, i + 1)
        if (got) correctedChapter = got[0]
      } else if (w === "verse" || w === "verses") {
        const got = consumeNumber(tokens, i + 1)
        if (got) correctedVerse = got[0]
      }
    }
  }

  // No keywords after the correction — a bare pair is the corrected value.
  if (correctedChapter === null && correctedVerse === null) {
    for (let i = correctionIdx + 1; i + 1 < tokens.length; i++) {
      const first = tokens[i]
      if (first.t !== "number") continue
      const second = tokens[i + 1]
      let verse: number | null = null
      if (second.t === "number") verse = second.n
      else if (second.t === "colon") {
        const third = tokens[i + 2]
        if (third && third.t === "number") verse = third.n
      }
      if (verse !== null && first.n > 0 && verse > 0 && verse <= 176) {
        correctedChapter = first.n
        correctedVerse = verse
        break
      }
    }
  }

  const finalChapter = correctedChapter ?? initialChapter
  const finalVerse = correctedVerse ?? initialVerse
  if (finalChapter === null && finalVerse === null) return null

  return ref(bm, finalChapter ?? 1, finalVerse ?? 0)
}

function scanVerseEnd(tokens: Token[], start: number): number | null {
  if (start >= tokens.length) return null
  if (tokens[start].t === "dash") {
    const got = consumeNumber(tokens, start + 1)
    if (got) return got[0]
  }
  if (isWord(tokens[start], "to", "through")) {
    const next = start + 1
    if (next < tokens.length) {
      if (isWord(tokens[next], "verse", "verses")) {
        const got = consumeNumber(tokens, next + 1)
        if (got) return got[0]
      }
      const got = consumeNumber(tokens, next)
      if (got) return got[0]
    }
  }
  return null
}

function tryChapterVerseSpoken(tokens: Token[], bm: BookMatch): VerseRef | null {
  for (let i = 0; i < tokens.length; i++) {
    if (!isWord(tokens[i], "chapter")) continue
    const got = consumeNumber(tokens, i + 1)
    if (got) {
      const [chapter, nextIdx] = got
      const scanLimit = Math.min(nextIdx + 15, tokens.length)
      for (let j = nextIdx; j < scanLimit; j++) {
        if (isWord(tokens[j], "verse", "verses")) {
          const vg = consumeNumber(tokens, j + 1)
          if (vg) {
            return ref(bm, chapter, vg[0], scanVerseEnd(tokens, vg[1]))
          }
        }
      }
      // Chapter-only — held for refinement.
      return ref(bm, chapter, 0)
    }
    // "chapter" with no number yet (incomplete).
    return ref(bm, 1, 0)
  }
  return null
}

function tryVerseOnlyPattern(tokens: Token[], bm: BookMatch): VerseRef | null {
  for (let i = 0; i < tokens.length; i++) {
    if (!isWord(tokens[i], "verse", "verses")) continue
    let hasChapterBefore = false
    if (i > 0) {
      hasChapterBefore = tokens.slice(0, i).some((t) => {
        if (t.t === "number") return true
        if (t.t === "word") return t.w === "chapter" || parseSpokenNumber(t.w) !== null
        return false
      })
    }
    if (!hasChapterBefore) {
      const got = consumeNumber(tokens, i + 1)
      if (got) return ref(bm, 1, got[0])
      // Dangling "verse" → 1:1
      return ref(bm, 1, 1)
    }
  }
  return null
}

function trySplitChapterVersePattern(tokens: Token[], bm: BookMatch): VerseRef | null {
  for (let i = 0; i < tokens.length; i++) {
    const first = consumeNumberAt(tokens, i)
    if (!first) break
    const second = consumeNumberAt(tokens, first[1])
    if (!second) continue
    if (first[0] <= 0 || !(second[0] >= 1 && second[0] < 100)) continue
    const afterSecond = tokens[second[1]]
    if (!afterSecond || afterSecond.t !== "word") continue
    if (afterSecond.w !== "verse" && afterSecond.w !== "verses") continue
    const vg = consumeNumber(tokens, second[1] + 1)
    if (!vg) continue
    const joined = Number.parseInt(`${first[0]}${second[0]}`, 10)
    if (Number.isNaN(joined)) continue
    if (!isValidVerse(bm.book_number, joined, vg[0])) continue
    return ref(bm, joined, vg[0], scanVerseEnd(tokens, vg[1]))
  }
  return null
}

function tryNumberVersePattern(tokens: Token[], bm: BookMatch): VerseRef | null {
  for (let i = 0; i < tokens.length; i++) {
    const got = consumeNumberAt(tokens, i)
    if (!got) continue
    const [chapter, nextIdx] = got
    const scanLimit = Math.min(nextIdx + 10, tokens.length)
    for (let j = nextIdx; j < scanLimit; j++) {
      if (isWord(tokens[j], "verse", "verses")) {
        const vg = consumeNumber(tokens, j + 1)
        if (vg) {
          return ref(bm, chapter, vg[0], scanVerseEnd(tokens, vg[1]))
        }
      }
    }
  }
  return null
}

function trySpokenNumbers(tokens: Token[], bm: BookMatch): VerseRef | null {
  const got = consumeNumber(tokens, 0)
  if (!got) return null
  const [chapter, nextIdx] = got
  if (nextIdx >= tokens.length) return null
  if (!isWord(tokens[nextIdx], "verse", "verses")) return null
  const vg = consumeNumber(tokens, nextIdx + 1)
  if (!vg) return null
  const [verse, verseNext] = vg
  let verseEnd: number | null = null
  if (verseNext < tokens.length) {
    if (tokens[verseNext].t === "dash") {
      const eg = consumeNumber(tokens, verseNext + 1)
      if (eg) verseEnd = eg[0]
    }
    if (isWord(tokens[verseNext], "through", "to")) {
      const eg = consumeNumber(tokens, verseNext + 1)
      if (eg) verseEnd = eg[0]
    }
  }
  return ref(bm, chapter, verse, verseEnd)
}

function tryTwoNumbers(tokens: Token[], bm: BookMatch): VerseRef | null {
  const cg = consumeNumberAt(tokens, 0)
  if (!cg || cg[0] <= 0) return null
  const vg = consumeNumberAt(tokens, cg[1])
  if (!vg || vg[0] <= 0) return null
  const [verse, verseNext] = vg
  let verseEnd: number | null = null
  if (verseNext < tokens.length) {
    if (tokens[verseNext].t === "dash") {
      const eg = consumeNumber(tokens, verseNext + 1)
      if (eg) verseEnd = eg[0]
    }
    if (isWord(tokens[verseNext], "through", "to")) {
      const eg = consumeNumber(tokens, verseNext + 1)
      if (eg) verseEnd = eg[0]
    }
  }
  return ref(bm, cg[0], verse, verseEnd)
}

// ---------------------------------------------------------------------------
// Continuation extraction (completing a parked incomplete reference)
// ---------------------------------------------------------------------------

export function tryExtractContinuation(
  text: string,
  isBookOnly: boolean
): Continuation | null {
  const tokens = tokenize(text.toLowerCase().trim())
  if (tokens.length === 0) return null

  // "N:M" re-citation beats the bare-number pattern.
  for (let i = 0; i + 2 < Math.min(tokens.length, 8); i++) {
    const a = tokens[i]
    const b = tokens[i + 1]
    const c = tokens[i + 2]
    if (a.t === "number" && b.t === "colon" && c.t === "number") {
      if (a.n > 0 && c.n > 0 && c.n <= 176) {
        return { kind: "chapterAndVerse", chapter: a.n, verse: c.n }
      }
    }
  }

  // "chapter N [... verse M]"
  for (let i = 0; i < tokens.length; i++) {
    if (isWord(tokens[i], "chapter")) {
      const got = consumeNumber(tokens, i + 1)
      if (got && got[0] > 0) {
        const [chapter, nextIdx] = got
        const scanLimit = Math.min(nextIdx + 15, tokens.length)
        for (let j = nextIdx; j < scanLimit; j++) {
          if (isWord(tokens[j], "verse", "verses")) {
            const vg = consumeNumber(tokens, j + 1)
            if (vg && vg[0] > 0 && vg[0] <= 176) {
              return { kind: "chapterAndVerse", chapter, verse: vg[0] }
            }
          }
        }
        return { kind: "chapterOnly", chapter }
      }
    }
  }

  // "verse N"
  for (let i = 0; i < tokens.length; i++) {
    if (isWord(tokens[i], "verse", "verses")) {
      const vg = consumeNumber(tokens, i + 1)
      if (vg && vg[0] > 0 && vg[0] <= 176) {
        return { kind: "verseOnly", verse: vg[0] }
      }
    }
  }

  // Bare leading number.
  const bg = consumeNumberAt(tokens, 0)
  if (bg && bg[0] > 0 && bg[0] <= 176) {
    return isBookOnly ? { kind: "chapterOnly", chapter: bg[0] } : { kind: "verseOnly", verse: bg[0] }
  }

  return null
}

// ---------------------------------------------------------------------------
// Contextual (book-less) parsing
// ---------------------------------------------------------------------------

function colonPairIsTime(tokens: Token[], i: number): boolean {
  if (i > 0 && isWord(tokens[i - 1], "at")) return true
  const t3 = tokens[i + 3]
  const t4 = tokens[i + 4]
  if (isWord(t3, "am", "pm", "oclock")) return true
  if (t3?.t === "word" && t4?.t === "word") {
    if ((t3.w === "a" || t3.w === "p") && t4.w === "m") return true
    if (t3.w === "o" && t4.w === "clock") return true
  }
  return false
}

export function parseContextual(text: string): ContextualRef | null {
  const tokens = tokenize(text.toLowerCase().trim())
  if (tokens.length === 0) return null

  // "chapter N [... verse M]"
  for (let i = 0; i < tokens.length; i++) {
    if (isWord(tokens[i], "chapter")) {
      const got = consumeNumber(tokens, i + 1)
      if (got && got[0] > 0) {
        const [chapter, nextIdx] = got
        const scanLimit = Math.min(nextIdx + 15, tokens.length)
        for (let j = nextIdx; j < scanLimit; j++) {
          if (isWord(tokens[j], "verse", "verses")) {
            const vg = consumeNumber(tokens, j + 1)
            if (vg && vg[0] > 0 && vg[0] <= 176) {
              return { kind: "chapterVerse", chapter, verse: vg[0], keyword_anchored: true }
            }
          }
        }
        return { kind: "chapterOnly", chapter }
      }
    }
  }

  // "[N] verse M"
  for (let i = 0; i < tokens.length; i++) {
    if (isWord(tokens[i], "verse", "verses")) {
      const vg = consumeNumber(tokens, i + 1)
      if (vg && vg[0] > 0 && vg[0] <= 176) {
        if (i > 0) {
          const prev = tokens[i - 1]
          if (prev.t === "number" && prev.n > 0) {
            return { kind: "chapterVerse", chapter: prev.n, verse: vg[0], keyword_anchored: true }
          }
        }
        return { kind: "verseOnly", verse: vg[0] }
      }
    }
  }

  // Bare "N:M" guarded against times of day.
  for (let i = 0; i + 2 < tokens.length; i++) {
    const a = tokens[i]
    const b = tokens[i + 1]
    const c = tokens[i + 2]
    if (a.t === "number" && b.t === "colon" && c.t === "number") {
      if (a.n > 0 && c.n > 0 && c.n <= 176 && !colonPairIsTime(tokens, i)) {
        return { kind: "chapterVerse", chapter: a.n, verse: c.n, keyword_anchored: false }
      }
    }
  }

  return null
}

/** All adjacent digit-number pairs ("22 20"), in order. */
export function extractAdjacentNumberPairs(text: string): Array<[number, number]> {
  const tokens = tokenize(text.toLowerCase().trim())
  const pairs: Array<[number, number]> = []
  for (let i = 0; i + 1 < tokens.length; i++) {
    const a = tokens[i]
    const b = tokens[i + 1]
    if (a.t === "number" && b.t === "number" && a.n > 0 && b.n > 0 && b.n <= 176) {
      pairs.push([a.n, b.n])
    }
  }
  return pairs
}
