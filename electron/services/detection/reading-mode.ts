/**
 * Reading mode: tracks the reader's position through a passage by matching
 * transcript word overlap against the loaded verses. Ported from
 * crates/detection/src/reading_mode.rs.
 */
import { parseSpokenNumber } from "./parser"

const READING_MODE_TIMEOUT_MS = 180_000
const MIN_WORD_OVERLAP = 0.4

export interface ReadingAdvance {
  book_number: number
  book_name: string
  chapter: number
  verse: number
  verse_text: string
  reference: string
  confidence: number
}

export interface ChapterChange {
  book_number: number
  book_name: string
  new_chapter: number
  start_verse: number | null
}

type BareNumberContext = "none" | "expectingChapter" | "expectingVerse"

interface LoadedVerse {
  verse_number: number
  text: string
  words: Set<string>
  wordCount: number
}

function textToWordSet(text: string): Set<string> {
  const out = new Set<string>()
  for (const w of text.split(/\s+/)) {
    const cleaned = w
      .toLowerCase()
      .split("")
      .filter((c) => /[a-z0-9']/.test(c))
      .join("")
    if (cleaned.length >= 2) out.add(cleaned)
  }
  return out
}

function wordOverlap(
  transcriptWords: Set<string>,
  verseWords: Set<string>,
  verseWordCount: number
): number {
  if (verseWordCount === 0) return 0
  let matches = 0
  for (const w of verseWords) {
    if (transcriptWords.has(w)) matches++
  }
  return matches / verseWordCount
}

/** Parse a leading number, returning it and the remaining text. */
function parseNumberAndRest(text: string): [number, string] | null {
  const trimmed = text.replace(/^\s+/, "")

  const digitMatch = trimmed.match(/^\d+/)
  if (digitMatch) {
    const n = Number.parseInt(digitMatch[0], 10)
    return [n, trimmed.slice(digitMatch[0].length)]
  }

  const firstWord = trimmed.split(/\s+/)[0]
  if (!firstWord) return null
  const cleanWord = firstWord.split("").filter((c) => /[a-zA-Z]/.test(c)).join("")
  const num = parseSpokenNumber(cleanWord)
  if (num === null) return null

  const rest: string = trimmed.slice(firstWord.length)

  // Compound spoken numbers like "thirty two".
  if (num >= 20 && num % 10 === 0) {
    const restTrimmed = rest.replace(/^\s+/, "")
    const secondWord = restTrimmed.split(/\s+/)[0]
    if (secondWord) {
      const cleanSecond = secondWord.split("").filter((c) => /[a-zA-Z]/.test(c)).join("")
      const ones = parseSpokenNumber(cleanSecond)
      if (ones !== null && ones >= 1 && ones <= 9) {
        return [num + ones, restTrimmed.slice(secondWord.length)]
      }
    }
  }
  return [num, rest]
}

function parseNumberToken(text: string): number | null {
  const trimmed = text.replace(/[.,?!]+$/, "")
  const alnum = trimmed.match(/^[a-zA-Z0-9]+/)
  if (alnum) {
    const n = Number.parseInt(alnum[0], 10)
    if (!Number.isNaN(n) && n > 0 && n <= 176) return n
  }
  const alpha = trimmed.match(/^[a-zA-Z]+/)
  if (alpha) {
    const n = parseSpokenNumber(alpha[0])
    if (n !== null && n > 0 && n <= 176) return n
  }
  return null
}

function extractVerseNumber(text: string): number | null {
  for (const keyword of ["verse ", "verses "]) {
    const pos = text.indexOf(keyword)
    if (pos !== -1) {
      return parseNumberToken(text.slice(pos + keyword.length))
    }
  }

  if (text.startsWith("first ")) {
    return parseNumberToken(text.slice("first ".length))
  }

  const first = parseNumberAndRest(text)
  if (first) {
    const restTrimmed = first[1].replace(/^\s+/, "")
    const second = parseNumberAndRest(restTrimmed)
    if (second !== null) return null // two numbers → chapter handler's job
    return first[0]
  }
  return null
}

function extractChapterAndVerse(text: string): [number, number | null] | null {
  const pos = text.indexOf("chapter ")
  if (pos !== -1) {
    const rest = text.slice(pos + "chapter ".length)
    const got = parseNumberAndRest(rest)
    if (got) {
      const versePos = got[1].indexOf("verse ")
      if (versePos !== -1) {
        const verseGot = parseNumberAndRest(got[1].slice(versePos + "verse ".length))
        if (verseGot) return [got[0], verseGot[0]]
      }
      return [got[0], null]
    }
  }

  // "3 verse 5"
  const first = parseNumberAndRest(text)
  if (first) {
    const versePos = first[1].indexOf("verse ")
    if (versePos !== -1) {
      const verseGot = parseNumberAndRest(first[1].slice(versePos + "verse ".length))
      if (verseGot) return [first[0], verseGot[0]]
    }
  }
  return null
}

export class ReadingMode {
  private active = false
  private bookNumber = 0
  private bookName = ""
  private chapter = 0
  private currentIndex = 0
  private verses: LoadedVerse[] = []
  private lastMatchTime = Date.now()
  private accumulatedText = ""
  private bareNumberContext: BareNumberContext = "none"

  start(
    bookNumber: number,
    bookName: string,
    chapter: number,
    startVerse: number,
    verses: Array<[number, string]>
  ): void {
    const loaded: LoadedVerse[] = verses.map(([v, text]) => {
      const words = textToWordSet(text)
      return { verse_number: v, text, words, wordCount: words.size }
    })
    if (loaded.length === 0) return

    const startIndex = Math.max(
      0,
      loaded.findIndex((v) => v.verse_number === startVerse)
    )

    this.active = true
    this.bookNumber = bookNumber
    this.bookName = bookName
    this.chapter = chapter
    this.currentIndex = startIndex
    this.verses = loaded
    this.lastMatchTime = Date.now()
    this.accumulatedText = ""
  }

  isActive(): boolean {
    return this.active
  }

  hasVerses(): boolean {
    return this.verses.length > 0
  }

  resume(): void {
    if (this.verses.length === 0) return
    this.active = true
    this.lastMatchTime = Date.now()
  }

  currentBook(): number {
    return this.bookNumber
  }
  currentChapter(): number {
    return this.chapter
  }
  currentBookName(): string {
    return this.bookName
  }
  currentVerse(): number | null {
    if (!this.active) return null
    return this.verses[this.currentIndex]?.verse_number ?? null
  }

  setExpectingChapter(): void {
    this.bareNumberContext = "expectingChapter"
  }

  deactivate(): void {
    this.active = false
    this.verses = []
    this.accumulatedText = ""
  }

  /** Returns the requested chapter change, if the text asks for one. */
  checkChapterCommand(text: string): ChapterChange | null {
    if (this.verses.length === 0) return null

    const trimmed = text.toLowerCase().trim()

    if (!trimmed.includes("next") && !trimmed.includes("previous")) {
      if (
        (trimmed.includes("chapter") && trimmed.endsWith("chapter")) ||
        trimmed.endsWith("chapter?") ||
        trimmed.endsWith("chapter.")
      ) {
        this.bareNumberContext = "expectingChapter"
        return null
      }
    }

    if (this.bareNumberContext !== "none") {
      const first = parseNumberAndRest(trimmed)
      if (first) {
        const restTrimmed = first[1].trim()
        if (this.bareNumberContext === "expectingChapter") {
          const second = parseNumberAndRest(restTrimmed)
          if (second && second[1].trim() === "") {
            this.bareNumberContext = "none"
            return {
              book_number: this.bookNumber,
              book_name: this.bookName,
              new_chapter: first[0],
              start_verse: second[0],
            }
          }
          if (restTrimmed === "") {
            this.bareNumberContext = "expectingVerse"
            return {
              book_number: this.bookNumber,
              book_name: this.bookName,
              new_chapter: first[0],
              start_verse: 1,
            }
          }
        } else if (this.bareNumberContext === "expectingVerse") {
          if (restTrimmed === "") {
            this.bareNumberContext = "none"
            return null
          }
        }
      }
    }

    if (trimmed === "next chapter" || trimmed === "next chapter.") {
      return {
        book_number: this.bookNumber,
        book_name: this.bookName,
        new_chapter: this.chapter + 1,
        start_verse: null,
      }
    }

    if (trimmed === "previous chapter" || trimmed === "previous chapter.") {
      if (this.chapter > 1) {
        return {
          book_number: this.bookNumber,
          book_name: this.bookName,
          new_chapter: this.chapter - 1,
          start_verse: null,
        }
      }
      return null
    }

    const extracted = extractChapterAndVerse(trimmed)
    if (!extracted) return null
    const [chapterNum, verseNum] = extracted

    if (chapterNum === this.chapter && verseNum === null) return null

    if (verseNum !== null) {
      this.bareNumberContext = "none"
    } else {
      this.bareNumberContext = "expectingVerse"
    }

    return {
      book_number: this.bookNumber,
      book_name: this.bookName,
      new_chapter: chapterNum,
      start_verse: verseNum,
    }
  }

  /** Check whether the reader advanced; returns the advance event. */
  checkTranscript(text: string): ReadingAdvance | null {
    if (!this.active || this.verses.length === 0) return null

    if (this.active && Date.now() - this.lastMatchTime > READING_MODE_TIMEOUT_MS) {
      this.active = false
    }

    if (this.verses.length > 0) {
      const advance = this.checkVerseNumberReference(text)
      if (advance) {
        this.active = true
        return advance
      }
    }

    if (!this.active) return null

    if (this.accumulatedText) this.accumulatedText += " "
    this.accumulatedText += text

    const transcriptWords = textToWordSet(this.accumulatedText)

    const current = this.verses[this.currentIndex]
    if (current) {
      const overlap = wordOverlap(transcriptWords, current.words, current.wordCount)
      if (overlap >= MIN_WORD_OVERLAP) {
        const nextIdx = this.currentIndex + 1
        if (nextIdx < this.verses.length) {
          const next = this.verses[nextIdx]
          if (
            wordOverlap(transcriptWords, next.words, next.wordCount) >= MIN_WORD_OVERLAP
          ) {
            return this.advanceTo(nextIdx)
          }
        }
        this.lastMatchTime = Date.now()
        return null
      }
    }

    const nextIdx = this.currentIndex + 1
    if (nextIdx < this.verses.length) {
      const next = this.verses[nextIdx]
      if (wordOverlap(transcriptWords, next.words, next.wordCount) >= MIN_WORD_OVERLAP) {
        return this.advanceTo(nextIdx)
      }
    }

    const skipIdx = this.currentIndex + 2
    if (skipIdx < this.verses.length) {
      const skip = this.verses[skipIdx]
      if (wordOverlap(transcriptWords, skip.words, skip.wordCount) >= MIN_WORD_OVERLAP) {
        return this.advanceTo(skipIdx)
      }
    }

    return null
  }

  private checkVerseNumberReference(text: string): ReadingAdvance | null {
    const trimmed = text.toLowerCase().trim()

    if (this.bareNumberContext === "expectingVerse") {
      const got = parseNumberAndRest(trimmed)
      if (got && got[1].trim() === "") {
        this.bareNumberContext = "none"
        for (let idx = 0; idx < this.verses.length; idx++) {
          if (this.verses[idx].verse_number === got[0]) return this.advanceTo(idx)
        }
        return null
      }
    }

    if (
      trimmed === "next" ||
      trimmed === "next." ||
      trimmed === "next verse" ||
      trimmed === "next verse."
    ) {
      const nextIdx = this.currentIndex + 1
      if (nextIdx < this.verses.length) return this.advanceTo(nextIdx)
      return null
    }

    if (
      trimmed === "previous verse" ||
      trimmed === "previous verse." ||
      trimmed === "go back" ||
      trimmed === "go back."
    ) {
      if (this.currentIndex > 0) return this.advanceTo(this.currentIndex - 1)
      return null
    }

    const cleaned = trimmed
      .replace(/verse verse /g, "verse ")
      .replace(/verses verses /g, "verses ")

    const verseNum = extractVerseNumber(cleaned)
    if (verseNum === null) return null

    for (let idx = 0; idx < this.verses.length; idx++) {
      if (this.verses[idx].verse_number === verseNum) return this.advanceTo(idx)
    }
    return null
  }

  private advanceTo(index: number): ReadingAdvance | null {
    const verse = this.verses[index]
    if (!verse) return null

    this.currentIndex = index
    this.lastMatchTime = Date.now()
    this.accumulatedText = ""

    const reference = `${this.bookName} ${this.chapter}:${verse.verse_number}`
    return {
      book_number: this.bookNumber,
      book_name: this.bookName,
      chapter: this.chapter,
      verse: verse.verse_number,
      verse_text: verse.text,
      reference,
      confidence: 1.0,
    }
  }
}
