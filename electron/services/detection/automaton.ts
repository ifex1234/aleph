import { BOOKS } from "./books"

/**
 * Multi-pattern book-name matcher, standing in for the Aho-Corasick
 * automaton from crates/detection/src/direct/automaton.rs. Transcript
 * fragments are short enough that a plain scan over all patterns is fast;
 * the boundary rules and longest-match-wins resolution are ported exactly.
 */
export interface BookMatch {
  book_number: number
  book_name: string
  start: number
  end: number
}

/**
 * Two-letter abbreviations ("Is", "So", "Am") collide with ordinary English
 * words in transcripts; digit-bearing forms like "1 Sa" stay.
 */
function isSpeechSafe(pattern: string): boolean {
  return /\d/.test(pattern) || pattern.length > 2
}

interface Pattern {
  text: string
  bookNumber: number
  bookName: string
}

const PATTERNS: Pattern[] = (() => {
  const out: Pattern[] = []
  for (const book of BOOKS) {
    const add = (pattern: string): void => {
      if (!isSpeechSafe(pattern)) return
      out.push({ text: pattern, bookNumber: book.number, bookName: book.name })
    }
    const name = book.name.toLowerCase()
    const abbr = book.abbreviation.toLowerCase()
    add(name)
    if (abbr !== name) add(abbr)
    for (const alias of book.aliases) {
      const lower = alias.toLowerCase()
      if (lower !== name && lower !== abbr) add(lower)
    }
  }
  // Longest first so overlapping matches resolve deterministically.
  out.sort((a, b) => b.text.length - a.text.length)
  return out
})()

export class BookMatcher {
  /** Find all book-name matches at word boundaries; longest match wins. */
  findBooks(text: string): BookMatch[] {
    const textLower = text.toLowerCase()
    const raw: BookMatch[] = []

    for (const pattern of PATTERNS) {
      let from = 0
      for (;;) {
        const idx = textLower.indexOf(pattern.text, from)
        if (idx === -1) break
        from = idx + 1
        const end = idx + pattern.text.length

        // Word boundary at start (apostrophe is word-internal: "we're" must
        // not match the Revelation alias "re").
        if (idx > 0) {
          const prev = textLower[idx - 1]
          if (/[a-z0-9]/.test(prev) || prev === "'") continue
        }
        // Word boundary at end.
        if (end < textLower.length && /[a-z0-9]/.test(textLower[end])) continue

        raw.push({
          book_number: pattern.bookNumber,
          book_name: pattern.bookName,
          start: idx,
          end,
        })
      }
    }

    // Sort by start asc, length desc; keep non-overlapping greedy scan.
    raw.sort(
      (a, b) =>
        a.start - b.start || b.end - b.start - (a.end - a.start)
    )
    const result: BookMatch[] = []
    let lastEnd = 0
    for (const m of raw) {
      if (m.start >= lastEnd) {
        lastEnd = m.end
        result.push(m)
      }
    }
    return result
  }
}
