import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react"
import { CanvasVerse } from "./canvas-verse"
import type { BroadcastTheme, LyricsSlideContent, VerseRenderData } from "@/types/broadcast"

interface LyricsSlidesProps {
  theme: BroadcastTheme
  content: LyricsSlideContent | null
  isLive: boolean
  onVerseChange?: (index: number) => void
  transitionDuration?: number
  transitionType?: "fade" | "slide"
}

function SlideFace({
  theme,
  verse,
}: {
  theme: BroadcastTheme
  verse: VerseRenderData | null
}) {
  return (
    <div className="relative w-full h-full">
      <CanvasVerse theme={theme} verse={verse} className="h-full" />
    </div>
  )
}

export const LyricsSlides = memo(function LyricsSlides({
  theme,
  content,
  isLive,
  onVerseChange,
  transitionDuration = 300,
  transitionType = "fade",
}: LyricsSlidesProps) {
  const [currentVerseIndex, setCurrentVerseIndex] = useState(
    content?.currentVerseIndex ?? 0
  )
  const [displayedVerseIndex, setDisplayedVerseIndex] = useState(
    content?.currentVerseIndex ?? 0
  )
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const verses = useMemo(() => content?.verses ?? [], [content?.verses])
  const totalVerses = verses.length

  // Each lyric verse renders through the same auto-fitting canvas verse
  // renderer as Bible verses, so long stanzas shrink to fit the slide
  // instead of overflowing it. Newlines in the text are hard line breaks.
  const verseData = useMemo((): VerseRenderData | null => {
    const verse = verses[displayedVerseIndex]
    if (!content || !verse) return null
    const reference = [content.title, verse.label].filter(Boolean).join(" · ")
    return {
      reference,
      segments: [{ text: verse.text }],
    }
  }, [content, verses, displayedVerseIndex])

  const goToVerse = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalVerses) return
      if (index === currentVerseIndex) return

      if (transitionType === "fade" && totalVerses > 1) {
        setIsTransitioning(true)
        setDisplayedVerseIndex(index)

        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current)
        }
        transitionTimeoutRef.current = setTimeout(() => {
          setCurrentVerseIndex(index)
          setIsTransitioning(false)
          onVerseChange?.(index)
        }, transitionDuration)
      } else {
        setCurrentVerseIndex(index)
        setDisplayedVerseIndex(index)
        onVerseChange?.(index)
      }
    },
    [currentVerseIndex, totalVerses, transitionType, transitionDuration, onVerseChange]
  )

  const nextVerse = useCallback(() => {
    if (currentVerseIndex < totalVerses - 1) {
      goToVerse(currentVerseIndex + 1)
    }
  }, [currentVerseIndex, totalVerses, goToVerse])

  const prevVerse = useCallback(() => {
    if (currentVerseIndex > 0) {
      goToVerse(currentVerseIndex - 1)
    }
  }, [currentVerseIndex, goToVerse])

  // Sync with external verse change (from broadcast store)
  const prevContentVerseIndexRef = useRef<number | undefined>(content?.currentVerseIndex)
  useEffect(() => {
    const contentIndex = content?.currentVerseIndex
    if (contentIndex !== undefined && contentIndex !== prevContentVerseIndexRef.current && contentIndex !== currentVerseIndex) {
      prevContentVerseIndexRef.current = contentIndex
      goToVerse(contentIndex)
    }
  }, [content?.currentVerseIndex, currentVerseIndex, goToVerse])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLive) return

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault()
          nextVerse()
          break
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault()
          prevVerse()
          break
        case "Home":
          e.preventDefault()
          goToVerse(0)
          break
        case "End":
          e.preventDefault()
          goToVerse(totalVerses - 1)
          break
        default:
          if (e.key >= "1" && e.key <= "9") {
            const num = parseInt(e.key, 10) - 1
            if (num < totalVerses) {
              e.preventDefault()
              goToVerse(num)
            }
          }
      }
    }

    if (isLive) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isLive, totalVerses, nextVerse, prevVerse, goToVerse])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  if (!verses.length) {
    return (
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{ backgroundColor: theme.background.color }}
      >
        <div className="text-white/30 text-center px-8">
          No lyrics loaded
        </div>
      </div>
    )
  }

  const transitionStyles = {
    transition: `opacity ${transitionDuration}ms ease-in-out`,
    opacity: isTransitioning ? 0 : 1,
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: theme.background.color,
      }}
    >
      {transitionType === "fade" && totalVerses > 1 ? (
        <>
          <div
            key={`verse-${displayedVerseIndex}`}
            className="absolute inset-0"
            style={{
              ...transitionStyles,
              zIndex: isTransitioning ? 10 : 5,
            }}
          >
            <SlideFace theme={theme} verse={verseData} />
          </div>

          {isTransitioning && displayedVerseIndex !== currentVerseIndex && (
            <div
              key={`verse-${currentVerseIndex}`}
              className="absolute inset-0"
              style={{
                ...transitionStyles,
                opacity: 1,
                zIndex: 15,
              }}
            >
              <SlideFace theme={theme} verse={verseData} />
            </div>
          )}
        </>
      ) : (
        <div
          key={`verse-${currentVerseIndex}`}
          className="absolute inset-0"
        >
          <SlideFace theme={theme} verse={verseData} />
        </div>
      )}
    </div>
  )
})