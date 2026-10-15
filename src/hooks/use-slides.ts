import { useBroadcastStore } from "@/stores/broadcast-store"
import { resolveSlideKind, useSlidesStore } from "@/stores/slides-store"
import type { ImageSlide } from "@/types"

/**
 * Present an image slide deck to the live output. Each image renders on its
 * own full-screen slide; navigation happens through the live panel footer
 * (prev/next + counter) or keyboard arrows.
 */
function presentSlides(slides: ImageSlide[], index: number) {
  if (slides.length === 0) return
  const safeIndex = Math.min(Math.max(0, index), slides.length - 1)
  const broadcast = useBroadcastStore.getState()
  broadcast.setSlidesContent({
    slides: slides.map((s) => ({
      id: s.id,
      name: s.name,
      dataUrl: s.dataUrl,
      kind: resolveSlideKind(s),
      mimeType: s.mimeType,
    })),
    currentSlideIndex: safeIndex,
  })
  broadcast.setActiveContentType("slides")
}

/** Present the current slides deck starting at the given slide. */
function presentDeck(index = 0) {
  const { slides } = useSlidesStore.getState()
  presentSlides(slides, index)
}

export const slideActions = {
  presentSlides,
  presentDeck,
}

export function useSlides() {
  const slides = useSlidesStore((s) => s.slides)
  const isSidebarOpen = useSlidesStore((s) => s.isSidebarOpen)

  return {
    slides,
    isSidebarOpen,
    ...slideActions,
  }
}
