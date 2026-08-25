/**
 * Levenshtein fuzzy book-name matching for when the exact matcher finds
 * nothing. Ported from crates/detection/src/direct/fuzzy.rs.
 */
import { BOOKS } from "./books"

export interface FuzzyMatch {
  book_name: string
  book_number: number
  start: number
  end: number
  distance: number
}

function levenshtein(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length
  if (aLen === 0) return bLen
  if (bLen === 0) return aLen

  let prevRow = new Array<number>(bLen + 1)
  let currRow = new Array<number>(bLen + 1).fill(0)

  for (let j = 0; j <= bLen; j++) prevRow[j] = j

  for (let i = 1; i <= aLen; i++) {
    currRow[0] = i
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      currRow[j] = Math.min(prevRow[j] + cost, prevRow[j - 1] + 1, currRow[j - 1] + 1)
    }
    ;[prevRow, currRow] = [currRow, prevRow]
  }
  return prevRow[bLen]
}

function maxDistanceFor(name: string): number {
  if (name.length <= 4) return 1
  if (name.length <= 8) return 2
  return 3
}

export function fuzzyFindBooks(text: string): FuzzyMatch[] {
  const matches: FuzzyMatch[] = []
  const textLower = text.toLowerCase()

  // Word spans.
  const words: Array<[number, number, string]> = []
  {
    let i = 0
    while (i < textLower.length) {
      if (/\s/.test(textLower[i])) {
        i++
        continue
      }
      const start = i
      while (i < textLower.length && !/\s/.test(textLower[i])) i++
      words.push([start, i, textLower.slice(start, i)])
    }
  }

  // Windows of 1..=4 tokens cover multi-word names like "song of solomon".
  for (let windowSize = 1; windowSize <= 4; windowSize++) {
    for (let wi = 0; wi + windowSize <= words.length; wi++) {
      const spanStart = words[wi][0]
      const spanEnd = words[wi + windowSize - 1][1]
      const candidate = textLower.slice(spanStart, spanEnd)

      for (const book of BOOKS) {
        const bookLower = book.name.toLowerCase()
        const maxDist = maxDistanceFor(bookLower)
        const lenDiff = Math.abs(candidate.length - bookLower.length)
        if (lenDiff > maxDist) continue

        const dist = levenshtein(candidate, bookLower)
        if (dist > 0 && dist <= maxDist) {
          const dominated = matches.some(
            (m) => m.start === spanStart && m.end === spanEnd && m.distance <= dist
          )
          if (!dominated) {
            matches.push({
              book_name: book.name,
              book_number: book.number,
              start: spanStart,
              end: spanEnd,
              distance: dist,
            })
          }
        }
      }
    }
  }

  matches.sort((a, b) => a.start - b.start || a.distance - b.distance)
  const result: FuzzyMatch[] = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.start >= lastEnd) {
      lastEnd = m.end
      result.push(m)
    }
  }
  return result
}
