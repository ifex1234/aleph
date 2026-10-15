import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react"
import { VerseSlideRenderer } from "./verse-slide-renderer"
import { ThemeBackground } from "./theme-background"
import type { BroadcastTheme, VerseSlide, VerseSlidesContent } from "@/types/broadcast"

interface VerseSlidesProps {
  theme: BroadcastTheme
  content: VerseSlidesContent | null
  isLive: boolean
  onSlideChange?: (index: number) => void
  transitionDuration?: number
  transitionType?: "fade" | "slide"
}

function SlideFace({
  theme,
  slide,
}: {
  theme: BroadcastTheme
  slide: VerseSlide | null
}) {
  return (
    <div className="relative w-full h-full">
      <ThemeBackground theme={theme} className="absolute inset-0" />
      <VerseSlideRenderer theme={theme} slide={slide} />
    </div>
  )
}

export const VerseSlides = memo(function VerseSlides({
  theme,
  content,
  isLive,
  onSlideChange,
  transitionDuration = 300,
  transitionType = "fade",
}: VerseSlidesProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(
    content?.currentSlideIndex ?? 0
  )
  const [displayedSlideIndex, setDisplayedSlideIndex] = useState(
    content?.currentSlideIndex ?? 0
  )
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const slides = useMemo(() => content?.slides ?? [], [content?.slides])
  const totalSlides = slides.length

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSlides) return
      if (index === currentSlideIndex) return

      if (transitionType === "fade" && totalSlides > 1) {
        setIsTransitioning(true)
        setDisplayedSlideIndex(index)

        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current)
        }
        transitionTimeoutRef.current = setTimeout(() => {
          setCurrentSlideIndex(index)
          setIsTransitioning(false)
          onSlideChange?.(index)
        }, transitionDuration)
      } else {
        setCurrentSlideIndex(index)
        setDisplayedSlideIndex(index)
        onSlideChange?.(index)
      }
    },
    [currentSlideIndex, totalSlides, transitionType, transitionDuration, onSlideChange]
  )

  const nextSlide = useCallback(() => {
    if (currentSlideIndex < totalSlides - 1) {
      goToSlide(currentSlideIndex + 1)
    }
  }, [currentSlideIndex, totalSlides, goToSlide])

  const prevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      goToSlide(currentSlideIndex - 1)
    }
  }, [currentSlideIndex, goToSlide])

  // Sync with external slide change (from broadcast store)
  const prevContentSlideIndexRef = useRef<number | undefined>(content?.currentSlideIndex)
  useEffect(() => {
    const contentIndex = content?.currentSlideIndex
    if (contentIndex !== undefined && contentIndex !== prevContentSlideIndexRef.current && contentIndex !== currentSlideIndex) {
      prevContentSlideIndexRef.current = contentIndex
      goToSlide(contentIndex)
    }
  }, [content?.currentSlideIndex, currentSlideIndex, goToSlide])

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
          nextSlide()
          break
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault()
          prevSlide()
          break
        case "Home":
          e.preventDefault()
          goToSlide(0)
          break
        case "End":
          e.preventDefault()
          goToSlide(totalSlides - 1)
          break
        default:
          if (e.key >= "1" && e.key <= "9") {
            const num = parseInt(e.key, 10) - 1
            if (num < totalSlides) {
              e.preventDefault()
              goToSlide(num)
            }
          }
      }
    }

    if (isLive) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isLive, totalSlides, nextSlide, prevSlide, goToSlide])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  if (!slides.length) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <ThemeBackground theme={theme} className="absolute inset-0" />
        <div className="relative text-white/30 text-center px-8 z-10">
          No verses loaded
        </div>
      </div>
    )
  }

  const currentSlide = slides[currentSlideIndex]
  const displayedSlide = slides[displayedSlideIndex]

  const transitionStyles = {
    transition: `opacity ${transitionDuration}ms ease-in-out`,
    opacity: isTransitioning ? 0 : 1,
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <ThemeBackground theme={theme} className="absolute inset-0" />
      {transitionType === "fade" && totalSlides > 1 ? (
        <>
          <div
            key={`slide-${displayedSlideIndex}`}
            className="absolute inset-0"
            style={{
              ...transitionStyles,
              zIndex: isTransitioning ? 10 : 5,
            }}
          >
            <SlideFace theme={theme} slide={displayedSlide} />
          </div>

          {isTransitioning && displayedSlideIndex !== currentSlideIndex && (
            <div
              key={`slide-${currentSlideIndex}`}
              className="absolute inset-0"
              style={{
                ...transitionStyles,
                opacity: 1,
                zIndex: 15,
              }}
            >
              <SlideFace theme={theme} slide={currentSlide} />
            </div>
          )}
        </>
      ) : (
        <div
          key={`slide-${currentSlideIndex}`}
          className="absolute inset-0"
        >
          <SlideFace theme={theme} slide={currentSlide} />
        </div>
      )}

    </div>
  )
})