import type {
  VerseRenderData,
  VerseSlide,
  VerseSlidesContent,
} from "@/types/broadcast"

/**
 * Pure label arithmetic for "what comes after / before the verse on screen".
 * Similar to Cloud of Worship's verseNavigation.ts
 */

export interface BibleBookInfo {
  name: string
  chapters: number
}

const BIBLE_BOOKS: BibleBookInfo[] = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 },
]

function parseVerseLabel(label: string): {
  bookName: string
  chapter: number
  verse: number
  isRange: boolean
  endVerse?: number
} | null {
  // Handle formats like "John 3:16", "John 3:16-18", "1 John 3:16"
  const match = label.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/)
  if (!match) return null

  const bookName = match[1].trim()
  const chapter = parseInt(match[2], 10)
  const verse = parseInt(match[3], 10)
  const endVerse = match[4] ? parseInt(match[4], 10) : undefined

  return {
    bookName,
    chapter,
    verse,
    isRange: !!endVerse,
    endVerse,
  }
}

function findBookIndex(bookName: string): number {
  const normalized = bookName.toLowerCase()
  return BIBLE_BOOKS.findIndex(
    (b) => b.name.toLowerCase() === normalized
  )
}

function getBookInfo(bookName: string): BibleBookInfo | null {
  const index = findBookIndex(bookName)
  if (index === -1) return null
  return BIBLE_BOOKS[index]
}

function getVerseCountInChapter(bookName: string): number {
  // This is a simplified version - in reality you'd need a full verse map
  // For now, return a reasonable default
  const book = getBookInfo(bookName)
  if (!book) return 0
  // Most chapters have 20-50 verses, use chapter count as rough guide
  return Math.max(20, Math.min(150, book.chapters * 2))
}

export function computeNextVerseLabel(
  content: VerseSlidesContent | null,
  currentLabel: string,
  chapterVerseCount: number = 0
): string {
  if (!content || content.slides.length === 0) return currentLabel

  // First, check if we can just go to the next slide in the current content
  const currentIndex = content.slides.findIndex((s) => s.label === currentLabel)
  if (currentIndex !== -1 && currentIndex < content.slides.length - 1) {
    return content.slides[currentIndex + 1].label
  }

  // If at the last slide, try to compute the next verse biblically
  const parsed = parseVerseLabel(currentLabel)
  if (!parsed) return currentLabel

  const { bookName, chapter, verse, isRange, endVerse } = parsed
  const currentVerse = isRange ? (endVerse ?? verse) : verse
  const verseCount = chapterVerseCount || getVerseCountInChapter(bookName)

  // If at the last verse of the chapter, go to next chapter verse 1
  if (currentVerse >= verseCount) {
    const book = getBookInfo(bookName)
    if (book && chapter < book.chapters) {
      // Next chapter in the same book
      return `${bookName} ${chapter + 1}:1`
    } else {
      // Try next book
      const bookIndex = findBookIndex(bookName)
      if (bookIndex < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[bookIndex + 1]
        return `${nextBook.name} 1:1`
      }
      // Already at the very end of the Bible
      return currentLabel
    }
  }

  return `${bookName} ${chapter}:${currentVerse + 1}`
}

export function computePreviousVerseLabel(
  content: VerseSlidesContent | null,
  currentLabel: string
): string {
  if (!content || content.slides.length === 0) return currentLabel

  // First, check if we can just go to the previous slide in the current content
  const currentIndex = content.slides.findIndex((s) => s.label === currentLabel)
  if (currentIndex > 0) {
    return content.slides[currentIndex - 1].label
  }

  // If at the first slide, try to compute the previous verse biblically
  const parsed = parseVerseLabel(currentLabel)
  if (!parsed) return currentLabel

  const { bookName, chapter, verse, isRange } = parsed
  const currentVerse = isRange ? verse : verse

  if (currentVerse <= 1) {
    if (chapter > 1) {
      // Go to previous chapter - need to know last verse
      return `${bookName} ${chapter - 1}:LAST`
    } else {
      // Go to previous book's last chapter
      const bookIndex = findBookIndex(bookName)
      if (bookIndex > 0) {
        const prevBook = BIBLE_BOOKS[bookIndex - 1]
        return `${prevBook.name} ${prevBook.chapters}:LAST`
      }
      // Already at the very beginning of the Bible
      return currentLabel
    }
  }

  return `${bookName} ${chapter}:${currentVerse - 1}`
}

export function createVerseSlidesFromPassage(
  passageReference: string,
  verses: Array<{ verse: number; text: string }>
): VerseSlidesContent {
  const slides: VerseSlide[] = verses.map((v) => ({
    id: `verse-${v.verse}`,
    label: `${passageReference.split(":")[0]}:${v.verse}`,
    text: v.text,
    verseNumber: v.verse,
    reference: passageReference,
  }))

  return {
    slides,
    currentSlideIndex: 0,
    passageReference,
  }
}

/**
 * Adapt one verse slide to the canvas verse renderer (used for NDI output,
 * which captures a canvas, not the DOM slide components).
 */
export function verseSlideToRenderData(slide: VerseSlide): VerseRenderData {
  return {
    reference: slide.reference ?? slide.label,
    segments: [{ verseNumber: slide.verseNumber, text: slide.text }],
  }
}

export function createVerseSlidesFromText(
  lines: string[],
  title?: string
): VerseSlidesContent {
  const slides: VerseSlide[] = lines.map((line, i) => ({
    id: `line-${i}`,
    label: title ? `${title} ${i + 1}` : `Verse ${i + 1}`,
    text: line,
    verseNumber: i + 1,
  }))

  return {
    slides,
    currentSlideIndex: 0,
    passageReference: title,
  }
}