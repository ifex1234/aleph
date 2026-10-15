import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react"
import { resolveSlideKind } from "@/stores/slides-store"
import type { SlidesContent } from "@/types/broadcast"
import type { ImageSlide } from "@/types"

interface ImageSlidesProps {
  content: SlidesContent | null
  isLive: boolean
  onSlideChange?: (index: number) => void
  transitionDuration?: number
}

function SlideFace({ slide }: { slide: ImageSlide }) {
  const kind = resolveSlideKind(slide)
  if (kind === "video") {
    return (
      <video
        key={slide.id}
        src={slide.dataUrl}
        className="h-full w-full object-contain"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
    )
  }
  if (kind === "pdf") {
    return (
      <embed
        src={slide.dataUrl}
        type="application/pdf"
        className="h-full w-full bg-white"
      />
    )
  }
  return (
    <img
      src={slide.dataUrl}
      alt={slide.name}
      className="h-full w-full object-contain"
      draggable={false}
    />
  )
}

export const ImageSlides = memo(function ImageSlides({
  content,
  isLive,
  onSlideChange,
  transitionDuration = 300,
}: ImageSlidesProps) {
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

      if (totalSlides > 1) {
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
    [currentSlideIndex, totalSlides, transitionDuration, onSlideChange]
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
  const prevContentSlideIndexRef = useRef<number | undefined>(
    content?.currentSlideIndex
  )
  useEffect(() => {
    const contentIndex = content?.currentSlideIndex
    if (
      contentIndex !== undefined &&
      contentIndex !== prevContentSlideIndexRef.current &&
      contentIndex !== currentSlideIndex
    ) {
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
      <div className="relative flex h-full w-full items-center justify-center bg-black">
        <div className="px-8 text-center text-white/30">No slides loaded</div>
      </div>
    )
  }

  const displayedSlide = slides[displayedSlideIndex] ?? slides[0]
  const currentSlide = slides[currentSlideIndex] ?? slides[0]

  const transitionStyles = {
    transition: `opacity ${transitionDuration}ms ease-in-out`,
    opacity: isTransitioning ? 0 : 1,
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {totalSlides > 1 ? (
        <>
          <div
            key={`slide-${displayedSlideIndex}`}
            className="absolute inset-0"
            style={{
              ...transitionStyles,
              zIndex: isTransitioning ? 10 : 5,
            }}
          >
            <SlideFace slide={displayedSlide} />
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
              <SlideFace slide={currentSlide} />
            </div>
          )}
        </>
      ) : (
        <div key={`slide-${currentSlideIndex}`} className="absolute inset-0">
          <SlideFace slide={currentSlide} />
        </div>
      )}
    </div>
  )
})
