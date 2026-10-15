import { useEffect } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBibleStore, useBroadcastStore } from "@/stores"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData, toVerseRangeRenderData } from "@/hooks/use-broadcast"
import type { BroadcastContentType } from "@/types"

export function PreviewPanel() {
  const selectedVerse = useBibleStore((s) => s.selectedVerse)
  const selectedVerses = useBibleStore((s) => s.selectedVerses)
  const translations = useBibleStore((s) => s.translations)
  const activeTranslationId = useBibleStore((s) => s.activeTranslationId)

  // Content type from broadcast store (mirrors live output)
  const activeContentType = useBroadcastStore((s) => s.activeContentType)
  const timerContent = useBroadcastStore((s) => s.timerContent)
  const lyricsSlideContent = useBroadcastStore((s) => s.lyricsSlideContent)
  const slidesContent = useBroadcastStore((s) => s.slidesContent)

  // When translation changes, re-fetch the preview (single or range) in the new translation
  useEffect(() => {
    const state = useBibleStore.getState()
    // Range preview: refetch bounding span and re-filter to exact numbers
    if (state.selectedVerses && state.selectedVerses.length > 0) {
      const first = state.selectedVerses[0]
      const last = state.selectedVerses[state.selectedVerses.length - 1]
      // Derive bounding range from first/last or from stored numbers
      const nums = state.selectedVerseNumbers
      const fetchStart = nums ? Math.min(...nums) : first.verse
      const fetchEnd = nums ? Math.max(...nums) : last.verse
      bibleActions
        .fetchVerseRange(first.book_number, first.chapter, fetchStart, fetchEnd)
        .then((verses) => {
          let filtered = verses.filter((v) => v.text?.trim())
          if (nums?.length) {
            const wanted = new Set(nums)
            filtered = filtered.filter((v) => wanted.has(v.verse))
          }
          if (filtered.length > 0) {
            useBibleStore.getState().selectVerses(filtered, nums)
          }
        })
        .catch(() => {})
      return
    }
    const verse = state.selectedVerse
    if (verse && verse.book_number > 0 && verse.chapter > 0 && verse.verse > 0) {
      bibleActions
        .fetchVerse(verse.book_number, verse.chapter, verse.verse)
        .then((v) => {
          if (v) bibleActions.selectVerse(v)
        })
        .catch(() => {})
    }
  }, [activeTranslationId])
  const themes = useBroadcastStore((s) => s.themes)
  const activeThemeId = useBroadcastStore((s) => s.activeThemeId)

  const activeTheme = themes.find((t) => t.id === activeThemeId) ?? themes[0]
  const translation = translations.find((t) => t.id === activeTranslationId)?.abbreviation ?? "KJV"

  // Verse data from Bible panel selection
  const verseData =
    selectedVerses && selectedVerses.length > 0
      ? toVerseRangeRenderData(selectedVerses, translation)
      : selectedVerse
        ? toVerseRenderData(selectedVerse, translation)
        : null

  // Broadcast content (timer, lyrics from live output)
  const broadcastVerse = useBroadcastStore((s) => s.verseContent)

  return (
    <div
      data-slot="preview-panel"
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <PanelHeader title="Program preview">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Content:</span>
          <Select value={activeContentType} onValueChange={(v) => useBroadcastStore.getState().setActiveContentType(v as BroadcastContentType)}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
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
      </PanelHeader>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        {(() => {
          switch (activeContentType) {
            case "verse":
              // Show Bible panel selection when verse mode, or broadcast verse if none selected
              return <CanvasVerse theme={activeTheme} verse={verseData ?? broadcastVerse} />
            case "timer": {
              if (!timerContent) return <CanvasVerse theme={activeTheme} verse={null} />
              const displayMs = timerContent.displayMs
              const isRunning = timerContent.isRunning

              const totalSec = Math.floor(displayMs / 1000)
              const h = Math.floor(totalSec / 3600)
              const m = Math.floor((totalSec % 3600) / 60)
              const s = totalSec % 60
              const ms = Math.floor((displayMs % 1000) / 10)
              const timeStr = h > 0
                ? `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
                : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`

              return (
                <div className="relative w-full h-full">
                  <CanvasVerse theme={activeTheme} verse={null} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                    <div className="flex items-center justify-center px-6 py-3 font-mono text-5xl tabular-nums text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                      {timeStr}
                    </div>
                    {isRunning && (
                      <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
                    )}
                  </div>
                </div>
              )
            }
            case "lyrics": {
              if (!lyricsSlideContent || lyricsSlideContent.verses.length === 0) {
                return <CanvasVerse theme={activeTheme} verse={null} />
              }
              const current = lyricsSlideContent.verses[lyricsSlideContent.currentVerseIndex]
              return (
                <div className="flex flex-col items-center justify-center gap-2 w-full h-full overflow-y-auto px-4">
                  {lyricsSlideContent.title && (
                    <div className="text-sm text-white/50 mb-2">{lyricsSlideContent.title}</div>
                  )}
                  {current && (
                    <div className="space-y-3 text-center">
                      <div className="text-xs text-white/40 font-mono">{current.label}</div>
                      <div className="text-2xl leading-relaxed text-white whitespace-pre-line">
                        {current.text}
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-white/40 font-mono mt-2">
                    {lyricsSlideContent.currentVerseIndex + 1} / {lyricsSlideContent.verses.length}
                  </div>
                </div>
              )
            }
            case "slides": {
              const current =
                slidesContent?.slides[slidesContent?.currentSlideIndex ?? 0]
              if (!slidesContent || !current) {
                return <CanvasVerse theme={activeTheme} verse={null} />
              }
              return (
                <div className="flex flex-col items-center justify-center gap-2 w-full h-full overflow-hidden px-4">
                  <img
                    src={current.dataUrl}
                    alt={current.name}
                    className="max-w-full max-h-full object-contain rounded-md"
                  />
                  <div className="text-xs text-white/40 font-mono">
                    {(slidesContent?.currentSlideIndex ?? 0) + 1} /{" "}
                    {slidesContent?.slides.length ?? 0}
                  </div>
                </div>
              )
            }
            case "blank":
            default:
              return <CanvasVerse theme={activeTheme} verse={null} />
          }
        })()}
      </div>
    </div>
  )
}
