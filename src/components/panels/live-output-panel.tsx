import { useEffect, useRef } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { VerseSlides } from "@/components/ui/verse-slides"
import { LyricsSlides } from "@/components/ui/lyrics-slides"
import { ImageSlides } from "@/components/ui/image-slides"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  useBroadcastStore,
  useBibleStore,
  useTimerStore,
  useLyricsStore,
  useHymnStore,
} from "@/stores"
import {
  presentVerse,
  toVerseRenderData,
  toVerseRangeRenderData,
} from "@/hooks/use-broadcast"
import { bibleActions } from "@/hooks/use-bible"
import { parseSongLyrics } from "@/lib/lyrics-content"
import type { BroadcastContentType, Verse, LyricsSlideContent } from "@/types"

export function LiveOutputPanel() {
  const isLive = useBroadcastStore((s) => s.isLive)
  const autoLive = useBroadcastStore((s) => s.autoLive)
  const liveVerse = useBroadcastStore((s) => s.liveVerse)
  const activeContentType = useBroadcastStore((s) => s.activeContentType)
  const setActiveContentType = useBroadcastStore((s) => s.setActiveContentType)
  const setTimerContent = useBroadcastStore((s) => s.setTimerContent)
  const themes = useBroadcastStore((s) => s.themes)
  const activeThemeId = useBroadcastStore((s) => s.activeThemeId)
  const activeTranslationId = useBibleStore((s) => s.activeTranslationId)

  // Timer state for broadcast
  const { mode, elapsedMs, targetMs, isRunning } = useTimerStore()

  const activeTheme = themes.find((t) => t.id === activeThemeId) ?? themes[0]

  // The live output renders only what was explicitly presented — it no longer
  // follows the preview selection, so detections can't override the operator.
  const verseData = isLive ? liveVerse : null

  // Timer and lyrics content for preview
  const timerContent = useBroadcastStore((s) => s.timerContent)
  const lyricsSlideContent = useBroadcastStore((s) => s.lyricsSlideContent)
  const slidesContent = useBroadcastStore((s) => s.slidesContent)

  // Compute timer display values
  const displayMs =
    mode === "countdown" ? Math.max(0, targetMs - elapsedMs) : elapsedMs
  const isCritical = mode === "countdown" && displayMs < 10000 && displayMs > 0
  const isExpired = mode === "countdown" && displayMs === 0 && elapsedMs > 0

  // Sync timer content to broadcast store when live (throttled to ~1s)
  const lastTimerSyncRef = useRef(0)
  useEffect(() => {
    if (!isLive) return

    const now = Date.now()
    if (now - lastTimerSyncRef.current < 1000) return
    lastTimerSyncRef.current = now

    setTimerContent({
      displayMs,
      isRunning,
      mode,
      isCritical,
      isExpired,
    })
  }, [
    isLive,
    displayMs,
    isRunning,
    mode,
    isCritical,
    isExpired,
    setTimerContent,
  ])

  // Sync lyrics slide content to broadcast store when lyrics content type is active.
  // A presented hymn owns the lyrics channel until the operator picks a
  // different song, so the song sync must not clobber it.
  const lastLyricsSyncRef = useRef(0)
  const lastSongIdRef = useRef<string | null>(null)
  const songSyncPrimedRef = useRef(false)
  const setLyricsSlideContent = useBroadcastStore(
    (s) => s.setLyricsSlideContent
  )
  const lyricsSource = useBroadcastStore((s) => s.lyricsSource)
  const { songs, activeSongId } = useLyricsStore()

  useEffect(() => {
    if (!isLive) return
    if (activeContentType !== "lyrics") return

    // Takeover only on a genuine song change after the first run: the ref
    // starts unprimed so a pre-selected song is not mistaken for a change
    // that should steal the channel from a presented hymn.
    const songChanged =
      songSyncPrimedRef.current && activeSongId !== lastSongIdRef.current
    songSyncPrimedRef.current = true
    lastSongIdRef.current = activeSongId
    if (lyricsSource === "hymn" && !songChanged) return

    const now = Date.now()
    if (now - lastLyricsSyncRef.current < 1000 && !songChanged) return
    lastLyricsSyncRef.current = now

    const song = songs.find((s) => s.id === activeSongId)
    // Parse lyrics into verses (split by blank lines)
    const verses = song ? parseSongLyrics(song.lyrics) : []

    if (!song || verses.length === 0) {
      // Never blank a presented hymn with missing/empty song content.
      if (lyricsSource !== "hymn") setLyricsSlideContent(null)
      return
    }

    const slideContent: LyricsSlideContent = {
      verses,
      currentVerseIndex: 0,
      title: song.title,
      author: song.artiste,
    }

    useBroadcastStore.getState().setLyricsSource("song")
    setLyricsSlideContent(slideContent)
  }, [
    isLive,
    activeContentType,
    activeSongId,
    songs,
    lyricsSource,
    setLyricsSlideContent,
  ])

  // Refetch the live verse/range when the translation changes so the live
  // output text follows the new translation. Updates the live output only —
  // the preview keeps whatever the operator is browsing.
  useEffect(() => {
    const { liveSourceRange, liveSourceRangeNumbers, liveSourceVerse } =
      useBroadcastStore.getState()
    const bible = useBibleStore.getState()
    const abbreviation =
      bible.translations.find((t) => t.id === bible.activeTranslationId)
        ?.abbreviation ?? "KJV"

    if (liveSourceRange) {
      bibleActions
        .fetchVerseRange(
          liveSourceRange.bookNumber,
          liveSourceRange.chapter,
          liveSourceRange.startVerse,
          liveSourceRange.endVerse
        )
        .then((verses: Verse[]) => {
          let filtered = verses.filter((v: Verse) => v.text?.trim())
          if (liveSourceRangeNumbers?.length) {
            const wanted = new Set(liveSourceRangeNumbers)
            filtered = filtered.filter((v: Verse) => wanted.has(v.verse))
          }
          if (filtered.length === 0) return
          useBroadcastStore
            .getState()
            .setLiveVerse(
              toVerseRangeRenderData(filtered, abbreviation),
              filtered[0],
              liveSourceRange,
              liveSourceRangeNumbers
            )
        })
        .catch(() => {})
      return
    }

    if (!liveSourceVerse) return
    bibleActions
      .fetchVerse(
        liveSourceVerse.book_number,
        liveSourceVerse.chapter,
        liveSourceVerse.verse
      )
      .then((v) => {
        if (!v) return
        useBroadcastStore
          .getState()
          .setLiveVerse(toVerseRenderData(v, abbreviation), v)
      })
      .catch(() => {})
  }, [activeTranslationId])

  const verseSlidesContent = useBroadcastStore((s) => s.verseSlidesContent)

  const stepVerseSlide = (index: number) => {
    const current = useBroadcastStore.getState().verseSlidesContent
    if (!current || current.slides.length === 0) return
    const safe = Math.min(Math.max(0, index), current.slides.length - 1)
    useBroadcastStore.getState().setVerseSlidesContent({
      ...current,
      currentSlideIndex: safe,
    })
  }

  const stepImageSlide = (index: number) => {
    const current = useBroadcastStore.getState().slidesContent
    if (!current || current.slides.length === 0) return
    const safe = Math.min(Math.max(0, index), current.slides.length - 1)
    useBroadcastStore.getState().setSlidesContent({
      ...current,
      currentSlideIndex: safe,
    })
  }

  const stepLyricsVerse = (index: number) => {
    const current = useBroadcastStore.getState().lyricsSlideContent
    if (!current || current.verses.length === 0) return
    const safe = Math.min(Math.max(0, index), current.verses.length - 1)
    useBroadcastStore.getState().setLyricsSlideContent({
      ...current,
      currentVerseIndex: safe,
    })
    if (useBroadcastStore.getState().lyricsSource === "hymn") {
      useHymnStore.getState().selectStanza(safe)
    }
  }

  const handleGoLive = (checked: boolean) => {
    useBroadcastStore.getState().setLive(checked)
    // Going live with nothing presented yet: present the current preview
    // verse so the output isn't blank.
    if (checked && !useBroadcastStore.getState().liveVerse) {
      const selected = useBibleStore.getState().selectedVerse
      if (selected) void presentVerse(selected)
    }
  }

  return (
    <div
      data-slot="live-output-panel"
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card",
        isLive && "shadow-[inset_0_2px_0_0_oklch(0.577_0.245_27.325/0.3)]"
      )}
    >
      <PanelHeader title="Live display">
        <label
          className="flex items-center gap-2"
          title="When on, detected verses are presented to the live display automatically. Turn off for manual control."
        >
          <span
            className={cn(
              "text-[0.625rem] font-medium tracking-wider uppercase transition-colors",
              autoLive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Auto
          </span>
          <Switch
            checked={autoLive}
            onCheckedChange={(checked) =>
              useBroadcastStore.getState().setAutoLive(checked)
            }
          />
        </label>
        <label className="ml-2 flex items-center gap-2">
          <span
            className={cn(
              "text-[0.625rem] font-medium tracking-wider uppercase transition-colors",
              isLive ? "text-primary" : "text-muted-foreground"
            )}
          >
            {isLive ? "Live" : "Go live"}
          </span>
          <Switch
            checked={isLive}
            onCheckedChange={handleGoLive}
            className="data-[state=checked]:bg-primary"
          />
        </label>
      </PanelHeader>

      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center p-3 transition-opacity",
          !isLive && "opacity-40"
        )}
      >
        {(() => {
          switch (activeContentType) {
            case "verse": {
              const useSlides =
                verseSlidesContent && verseSlidesContent.slides.length > 0
              if (useSlides) {
                return (
                  <VerseSlides
                    theme={activeTheme}
                    content={verseSlidesContent}
                    isLive={isLive}
                    transitionDuration={activeTheme.transition?.duration ?? 300}
                    transitionType={
                      activeTheme.transition?.type === "slide"
                        ? "slide"
                        : "fade"
                    }
                    onSlideChange={(index) => stepVerseSlide(index)}
                  />
                )
              }
              return isLive ? (
                <CanvasVerse theme={activeTheme} verse={verseData} />
              ) : (
                <CanvasVerse theme={activeTheme} verse={null} />
              )
            }
            case "timer": {
              if (!timerContent)
                return <CanvasVerse theme={activeTheme} verse={null} />
              const displayMs = timerContent.displayMs
              const isRunning = timerContent.isRunning

              const totalSec = Math.floor(displayMs / 1000)
              const h = Math.floor(totalSec / 3600)
              const m = Math.floor((totalSec % 3600) / 60)
              const s = totalSec % 60
              const ms = Math.floor((displayMs % 1000) / 10)
              const timeStr =
                h > 0
                  ? `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
                  : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`

              return (
                <div className="relative h-full w-full">
                  <CanvasVerse theme={activeTheme} verse={null} />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="flex items-center justify-center px-6 py-3 font-mono text-5xl text-white tabular-nums drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                      {timeStr}
                    </div>
                    {isRunning && (
                      <div className="h-4 w-4 animate-pulse rounded-full bg-green-500 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
                    )}
                  </div>
                </div>
              )
            }
            case "lyrics": {
              if (
                !lyricsSlideContent ||
                lyricsSlideContent.verses.length === 0
              ) {
                return <CanvasVerse theme={activeTheme} verse={null} />
              }
              return (
                <LyricsSlides
                  theme={activeTheme}
                  content={lyricsSlideContent}
                  isLive={isLive}
                  onVerseChange={(index) => stepLyricsVerse(index)}
                />
              )
            }
            case "slides": {
              if (!slidesContent || slidesContent.slides.length === 0) {
                return <CanvasVerse theme={activeTheme} verse={null} />
              }
              return (
                <ImageSlides
                  content={slidesContent}
                  isLive={isLive}
                  onSlideChange={(index) => stepImageSlide(index)}
                />
              )
            }
            case "blank":
            default:
              return <CanvasVerse theme={activeTheme} verse={null} />
          }
        })()}
      </div>

      {/* Content type selector with verse navigation for lyrics */}
      <div className="border-t border-border px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">
              Content:
            </span>
            <Select
              value={activeContentType}
              onValueChange={(v) =>
                setActiveContentType(v as BroadcastContentType)
              }
            >
              <SelectTrigger className="h-7 w-35 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verse">Bible Verse</SelectItem>
                <SelectItem value="timer">Timer</SelectItem>
                <SelectItem value="lyrics">Lyrics</SelectItem>
                <SelectItem value="slides">Slides</SelectItem>
                <SelectItem value="blank">Blank</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Slide navigation for image slides */}
          {activeContentType === "slides" &&
            slidesContent &&
            slidesContent.slides.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    stepImageSlide(slidesContent.currentSlideIndex - 1)
                  }
                  disabled={slidesContent.currentSlideIndex === 0}
                  aria-label="Previous slide"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m18 15-6-6 6-6" />
                  </svg>
                </Button>
                <span className="w-12 text-center font-mono text-xs text-muted-foreground tabular-nums">
                  {slidesContent.currentSlideIndex + 1} /{" "}
                  {slidesContent.slides.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    stepImageSlide(slidesContent.currentSlideIndex + 1)
                  }
                  disabled={
                    slidesContent.currentSlideIndex >=
                    slidesContent.slides.length - 1
                  }
                  aria-label="Next slide"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6-6 6" />
                  </svg>
                </Button>
              </div>
            )}

          {/* Slide navigation for Bible verses */}
          {activeContentType === "verse" &&
            verseSlidesContent &&
            verseSlidesContent.slides.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    stepVerseSlide(verseSlidesContent.currentSlideIndex - 1)
                  }
                  disabled={verseSlidesContent.currentSlideIndex === 0}
                  aria-label="Previous verse"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m18 15-6-6 6-6" />
                  </svg>
                </Button>
                <span className="w-12 text-center font-mono text-xs text-muted-foreground tabular-nums">
                  {verseSlidesContent.currentSlideIndex + 1} /{" "}
                  {verseSlidesContent.slides.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    stepVerseSlide(verseSlidesContent.currentSlideIndex + 1)
                  }
                  disabled={
                    verseSlidesContent.currentSlideIndex >=
                    verseSlidesContent.slides.length - 1
                  }
                  aria-label="Next verse"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6-6 6" />
                  </svg>
                </Button>
              </div>
            )}

          {/* Verse navigation for lyrics */}
          {activeContentType === "lyrics" &&
            lyricsSlideContent &&
            lyricsSlideContent.verses.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    stepLyricsVerse(lyricsSlideContent.currentVerseIndex - 1)
                  }
                  disabled={lyricsSlideContent.currentVerseIndex === 0}
                  aria-label="Previous verse"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m18 15-6-6 6-6" />
                  </svg>
                </Button>
                <span className="w-12 text-center font-mono text-xs text-muted-foreground tabular-nums">
                  {lyricsSlideContent.currentVerseIndex + 1} /{" "}
                  {lyricsSlideContent.verses.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    stepLyricsVerse(lyricsSlideContent.currentVerseIndex + 1)
                  }
                  disabled={
                    lyricsSlideContent.currentVerseIndex >=
                    lyricsSlideContent.verses.length - 1
                  }
                  aria-label="Next verse"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6-6 6" />
                  </svg>
                </Button>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
