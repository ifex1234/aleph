/**
 * Recent-reference context so partial references ("verse 17") resolve
 * against the last book/chapter heard. Ported from context.rs.
 */
import type { VerseRef } from "./parser"

const CONTEXT_TIMEOUT_SECS = 90

export class ReferenceContext {
  private lastBook: number | null = null
  private lastBookName: string | null = null
  private lastChapter: number | null = null
  private lastTimestamp: number | null = null

  private isValid(): boolean {
    return (
      this.lastTimestamp !== null &&
      (Date.now() - this.lastTimestamp) / 1000 < CONTEXT_TIMEOUT_SECS
    )
  }

  resolve(partial: VerseRef): VerseRef {
    const resolved = { ...partial }
    if (!this.isValid()) return resolved

    if (resolved.book_number === 0 && this.lastBook !== null) {
      resolved.book_number = this.lastBook
    }
    if (
      resolved.book_name === "" &&
      resolved.book_number !== 0 &&
      this.lastBookName !== null &&
      resolved.book_number === this.lastBook
    ) {
      resolved.book_name = this.lastBookName
    }
    if (
      resolved.chapter === 0 &&
      resolved.book_number !== 0 &&
      this.lastChapter !== null &&
      this.lastBook === resolved.book_number
    ) {
      resolved.chapter = this.lastChapter
    }
    return resolved
  }

  isFresh(withinSecs: number): boolean {
    return (
      this.lastTimestamp !== null &&
      (Date.now() - this.lastTimestamp) / 1000 < withinSecs
    )
  }

  lastBookHeard(): [number, string] | null {
    if (!this.isValid() || this.lastBook === null || this.lastBookName === null) {
      return null
    }
    return [this.lastBook, this.lastBookName]
  }

  lastChapterHeard(): number | null {
    return this.isValid() ? this.lastChapter : null
  }

  update(verseRef: VerseRef): void {
    if (verseRef.book_number !== 0) {
      this.lastBook = verseRef.book_number
      this.lastBookName = verseRef.book_name
    }
    if (verseRef.chapter !== 0) {
      this.lastChapter = verseRef.chapter
    }
    this.lastTimestamp = Date.now()
  }
}
