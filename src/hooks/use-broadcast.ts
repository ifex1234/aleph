import { invoke } from "@tauri-apps/api/core"
import { mark } from "@/lib/latency-marks"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { useBibleStore } from "@/stores/bible-store"
import type { VerseRenderData, VerseSlidesContent, VerseSlide } from "@/types"
import type { Verse } from "@/types"
import { toast } from "sonner"

export function toVerseRenderData(
  verse: Verse,
  translation: string
): VerseRenderData {
  return {
    reference: `${verse.book_name} ${verse.chapter}:${verse.verse} (${translation})`,
    segments: [{ verseNumber: verse.verse, text: verse.text }],
  }
}

export function toVerseRangeRenderData(
  verses: Verse[],
  translation: string
): VerseRenderData {
  if (verses.length === 0) {
    return { reference: "", segments: [] }
  }
  const first = verses[0]

  // Build a human reference: collapse contiguous spans, list disjoint ones
  // e.g. [1,2,3] -> "1-3", [1,2,5] -> "1-2,5", [1,3,5-7] -> "1,3,5-7"
  const nums = verses.map((v) => v.verse).sort((a, b) => a - b)
  const parts: string[] = []
  let runStart = nums[0]
  let runEnd = nums[0]
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === runEnd + 1) {
      runEnd = nums[i]
    } else {
      parts.push(runStart === runEnd ? `${runStart}` : `${runStart}-${runEnd}`)
      runStart = nums[i]
      runEnd = nums[i]
    }
  }
  parts.push(runStart === runEnd ? `${runStart}` : `${runStart}-${runEnd}`)
  const verseRef = parts.join(",")
  const segments = verses.map((v) => ({ verseNumber: v.verse, text: v.text }))
  return {
    reference: `${first.book_name} ${first.chapter}:${verseRef} (${translation})`,
    segments,
  }
}

// Monotonic ticket so an older present whose refetch resolves late can't
// overwrite a newer one (detections can present in quick succession).
let presentSeq = 0

/**
 * Refetch the full verse from the backend and present it to preview + live
 * output. Queue/detection items may carry partial verse objects (empty text,
 * synthetic id 0, stale translation_id), so always look the verse up by
 * book/chapter/verse against the active translation. Falls back to the passed
 * verse if the lookup fails — never blanks the output on error.
 *
 * This is the ONLY path that changes the live output verse. Manual selection
 * (verse click, arrow navigation, search) presents directly; detections update
 * only the preview unless the Auto toggle is on.
 */
export async function presentVerse(verse: Verse): Promise<void> {
  presentSeq += 1
  const ticket = presentSeq
  mark(`presentVerse start ${verse.book_name} ${verse.chapter}:${verse.verse}`)

  let verseToPresent = verse
  try {
    const fullVerse = await invoke<Verse | null>("get_verse", {
      translationId: useBibleStore.getState().activeTranslationId,
      bookNumber: verse.book_number,
      chapter: verse.chapter,
      verse: verse.verse,
    })
    verseToPresent = fullVerse ?? verse
  } catch (e) {
    console.warn("[broadcast] get_verse refetch failed, using cached verse:", e)
  }
  mark(
    `presentVerse get_verse done ${verse.book_name} ${verse.chapter}:${verse.verse}`
  )

  // A newer present started while we were refetching — let it win.
  if (ticket !== presentSeq) return

  // Never present a verse with no text (e.g. a citation that doesn't exist
  // in the active translation) — keep whatever is currently live instead.
  if (!verseToPresent.text?.trim()) {
    console.warn(
      "[broadcast] refusing to present verse with empty text:",
      `${verseToPresent.book_name} ${verseToPresent.chapter}:${verseToPresent.verse}`
    )
    return
  }

  const bibleState = useBibleStore.getState()
  const translation =
    bibleState.translations.find((t) => t.id === bibleState.activeTranslationId)
      ?.abbreviation ?? "KJV"

  // Keep the preview in sync with what was just presented.
  bibleState.selectVerse(verseToPresent)
  useBroadcastStore
    .getState()
    .setLiveVerse(
      toVerseRenderData(verseToPresent, translation),
      verseToPresent
    )
  mark(
    `presentVerse end ${verseToPresent.book_name} ${verseToPresent.chapter}:${verseToPresent.verse}`
  )
}

/**
 * Parse a freeform verse-range string into a sorted list of verse numbers.
 * Accepts: "1-3", "1,3,5", "1-3,5,7-9", "1 - 3 , 5" etc.
 * Returns empty when nothing parseable.
 */
export function parseVerseRangeInput(input: string): number[] {
  const verseSet = new Set<number>()
  for (const part of input.split(",")) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (trimmed.includes("-")) {
      const [a, b] = trimmed.split("-").map((n) => parseInt(n.trim(), 10))
      if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) continue
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      for (let n = lo; n <= hi; n++) verseSet.add(n)
    } else {
      const n = parseInt(trimmed, 10)
      if (Number.isFinite(n) && n >= 1) verseSet.add(n)
    }
  }
  return [...verseSet].sort((x, y) => x - y)
}

/**
 * Present a range of verses (e.g., Genesis 1:1-3).
 * Supports both contiguous ("1-3") and disjoint ("1,3,5" or "1-2,5") sets.
 * For disjoint sets, fetches the bounding range once and filters to the
 * requested verses so only one backend round-trip is needed.
 */
export async function presentVerseRange(
  bookNumber: number,
  chapter: number,
  startVerse: number,
  endVerse: number,
  opts?: { verseNumbers?: number[] }
): Promise<void> {
  presentSeq += 1
  const ticket = presentSeq
  const explicit = opts?.verseNumbers?.length ? opts.verseNumbers : null
  const label = explicit ? explicit.join(",") : `${startVerse}-${endVerse}`
  mark(`presentVerseRange start ${bookNumber} ${chapter}:${label}`)

  if (!explicit && startVerse > endVerse) {
    toast.error("Start verse cannot be after end verse")
    return
  }

  const fetchStart = explicit ? Math.min(...explicit) : startVerse
  const fetchEnd = explicit ? Math.max(...explicit) : endVerse

  let versesToPresent: Verse[] = []
  try {
    versesToPresent = await invoke<Verse[]>("get_verse_range", {
      translationId: useBibleStore.getState().activeTranslationId,
      bookNumber,
      chapter,
      startVerse: fetchStart,
      endVerse: fetchEnd,
    })
  } catch (e) {
    console.warn("[broadcast] get_verse_range refetch failed:", e)
    toast.error("Failed to fetch verses")
    return
  }
  mark(
    `presentVerseRange get_verse_range done ${bookNumber} ${chapter}:${label}`
  )

  if (ticket !== presentSeq) return

  // For explicit (disjoint) requests, keep only the requested verse numbers
  if (explicit) {
    const wanted = new Set(explicit)
    versesToPresent = versesToPresent.filter((v) => wanted.has(v.verse))
  }

  versesToPresent = versesToPresent.filter((v) => v.text?.trim())
  if (versesToPresent.length === 0) {
    console.warn(
      "[broadcast] refusing to present verse range with no text:",
      `${bookNumber} ${chapter}:${label}`
    )
    toast.error("No verses found in range")
    return
  }

  const bibleState = useBibleStore.getState()
  const translation =
    bibleState.translations.find((t) => t.id === bibleState.activeTranslationId)
      ?.abbreviation ?? "KJV"

  // Keep Program preview in sync with what was presented (full range, not just first verse)
  bibleState.selectVerses(versesToPresent, explicit)
  const first = versesToPresent[0]
  useBroadcastStore
    .getState()
    .setLiveVerse(
      toVerseRangeRenderData(versesToPresent, translation),
      first,
      { bookNumber, chapter, startVerse: fetchStart, endVerse: fetchEnd },
      explicit
    )
  mark(`presentVerseRange end ${bookNumber} ${chapter}:${label}`)
}

export const broadcastActions = {
  setLiveVerse: (verse: VerseRenderData | null) =>
    useBroadcastStore.getState().setLiveVerse(verse),
  setLive: (live: boolean) => useBroadcastStore.getState().setLive(live),
  getActiveTheme: () => {
    const s = useBroadcastStore.getState()
    return s.themes.find((t) => t.id === s.activeThemeId) ?? s.themes[0]
  },
  presentVerseSlides: (slides: VerseSlidesContent) =>
    useBroadcastStore.getState().setVerseSlidesContent(slides),
}

/**
 * Create a VerseSlidesContent from a list of verses.
 * This enables slide-based verse rendering like Cloud of Worship.
 */
export function createVerseSlides(
  verses: Verse[],
  translation: string
): VerseSlidesContent {
  const slides: VerseSlide[] = verses.map((v) => ({
    id: `verse-${v.verse}`,
    label: `${v.book_name} ${v.chapter}:${v.verse}`,
    text: v.text,
    verseNumber: v.verse,
    reference: `${v.book_name} ${v.chapter}:${v.verse} (${translation})`,
  }))

  return {
    slides,
    currentSlideIndex: 0,
    passageReference: `${verses[0]?.book_name} ${verses[0]?.chapter}:${verses[0]?.verse}`,
  }
}

/**
 * Present a range of verses as individual slides (Cloud of Worship style).
 * Each verse becomes its own slide for smooth navigation.
 */
export async function presentVerseRangeAsSlides(
  bookNumber: number,
  chapter: number,
  startVerse: number,
  endVerse: number,
  opts?: { verseNumbers?: number[] }
): Promise<void> {
  presentSeq += 1
  const ticket = presentSeq
  const explicit = opts?.verseNumbers?.length ? opts.verseNumbers : null
  const label = explicit ? explicit.join(",") : `${startVerse}-${endVerse}`
  mark(`presentVerseRangeAsSlides start ${bookNumber} ${chapter}:${label}`)

  if (!explicit && startVerse > endVerse) {
    toast.error("Start verse cannot be after end verse")
    return
  }

  const fetchStart = explicit ? Math.min(...explicit) : startVerse
  const fetchEnd = explicit ? Math.max(...explicit) : endVerse

  let versesToPresent: Verse[] = []
  try {
    versesToPresent = await invoke<Verse[]>("get_verse_range", {
      translationId: useBibleStore.getState().activeTranslationId,
      bookNumber,
      chapter,
      startVerse: fetchStart,
      endVerse: fetchEnd,
    })
  } catch (e) {
    console.warn("[broadcast] get_verse_range refetch failed:", e)
    toast.error("Failed to fetch verses")
    return
  }
  mark(`presentVerseRangeAsSlides get_verse_range done ${bookNumber} ${chapter}:${label}`)

  if (ticket !== presentSeq) return

  // For explicit (disjoint) requests, keep only the requested verse numbers
  if (explicit) {
    const wanted = new Set(explicit)
    versesToPresent = versesToPresent.filter((v) => wanted.has(v.verse))
  }

  versesToPresent = versesToPresent.filter((v) => v.text?.trim())
  if (versesToPresent.length === 0) {
    console.warn(
      "[broadcast] refusing to present verse range with no text:",
      `${bookNumber} ${chapter}:${label}`
    )
    toast.error("No verses found in range")
    return
  }

  const bibleState = useBibleStore.getState()
  const translation =
    bibleState.translations.find((t) => t.id === bibleState.activeTranslationId)
      ?.abbreviation ?? "KJV"

  // Keep Program preview in sync with what was presented (full range, not just first verse)
  bibleState.selectVerses(versesToPresent, explicit)
  const first = versesToPresent[0]
  
  // Create slide-based content
  const slidesContent = createVerseSlides(versesToPresent, translation)
  
  // Set both the traditional verse content (for canvas rendering) and slides content
  useBroadcastStore
    .getState()
    .setLiveVerse(
      toVerseRangeRenderData(versesToPresent, translation),
      first,
      { bookNumber, chapter, startVerse: fetchStart, endVerse: fetchEnd },
      explicit
    )
  useBroadcastStore.getState().setVerseSlidesContent(slidesContent)
  
  mark(`presentVerseRangeAsSlides end ${bookNumber} ${chapter}:${label}`)
}
