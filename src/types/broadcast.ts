export interface VerseSegment {
  verseNumber?: number
  text: string
}

export interface VerseRenderData {
  reference: string
  segments: VerseSegment[]
}

export type BroadcastContentType = "verse" | "timer" | "lyrics" | "slides" | "blank"

export interface TimerContent {
  displayMs: number
  isRunning: boolean
  mode: "stopwatch" | "countdown"
  isCritical: boolean
  isExpired: boolean
}

export interface LyricsContent {
  lines: string[]
  currentLineIndex: number
  title?: string
  author?: string
}

/** A single verse within a lyrics slide */
export interface LyricsVerse {
  label: string
  text: string
}

/** Slide-based lyrics content — one slide with multiple verses (Cloud of Worship style) */
export interface LyricsSlideContent {
  /** All verses in the song */
  verses: LyricsVerse[]
  /** Currently displayed verse index */
  currentVerseIndex: number
  /** Song title */
  title?: string
  /** Artist name */
  author?: string
}

/** A single verse slide — one verse per slide, like Cloud of Worship */
export interface VerseSlide {
  id: string
  /** The verse reference label (e.g., "John 3:16", "Verse 2") */
  label: string
  /** The verse text content */
  text: string
  /** Optional verse number for ordering */
  verseNumber?: number
  /** Optional reference (e.g., "John 3:16") */
  reference?: string
}

/** Slide-based verse content — multiple verses as individual slides */
export interface VerseSlidesContent {
  slides: VerseSlide[]
  currentSlideIndex: number
  /** The full passage reference (e.g., "John 3:16-18") */
  passageReference?: string
}

/** Media kind for a presentation slide. */
export type SlideMediaKind = "image" | "video" | "pdf"

/** A single presentation slide (announcements, etc.): image, video, or PDF. */
export interface ImageSlide {
  id: string
  name: string
  dataUrl: string
  /** Media kind; absent on decks saved before video/PDF support (treat as image). */
  kind?: SlideMediaKind
  mimeType?: string
}

/** Image slide deck content — one image per slide with navigation */
export interface SlidesContent {
  slides: ImageSlide[]
  currentSlideIndex: number
}

export interface BroadcastContent {
  type: BroadcastContentType
  verse?: VerseRenderData | null
  timer?: TimerContent | null
  lyrics?: LyricsContent | null
  lyricsSlide?: LyricsSlideContent | null
  verseSlides?: VerseSlidesContent | null
  slides?: SlidesContent | null
}

export interface RenderOptions {
  opacity?: number
  offsetX?: number
  offsetY?: number
  scale?: number               // Scale factor for rendering at display size (e.g., 0.42 for 400px panel)
  imageCache?: Map<string, HTMLImageElement>
  /** Clock time driving animated gradient backgrounds. Absent means a static frame. */
  timeMs?: number
}

/** A freely positioned element region, all values in % of canvas size (0-100), x/y = top-left. */
export interface ElementBox {
  x: number
  y: number
  width: number
  height: number
}

/** An image fill: how a picture is fitted into whatever rect it is drawn in. */
export interface ThemeImageFill {
  url: string
  fit: "cover" | "contain" | "stretch"
  blur: number
  brightness: number
  tint: string | null
}

/**
 * A filled surface drawn behind content — the container the text lives in.
 * Content wraps inside it, inset by `padding`.
 */
export interface SurfaceFill {
  enabled: boolean
  color: string
  opacity: number
  borderRadius: number
  /** Inset for the content on this surface, in theme px. */
  padding: number
  /** When set, fills the surface, clipped to `borderRadius`. */
  image: ThemeImageFill | null
}

export type TextHorizontalAlign = "left" | "center" | "right" | "justify"
export type TextVerticalAlign = "top" | "middle" | "bottom"
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize"
export type TextDecoration = "none" | "underline" | "line-through"

export interface BroadcastTheme {
  id: string
  name: string
  builtin: boolean
  pinned: boolean
  createdAt: number
  updatedAt: number
  resolution: { width: number; height: number }
  background: {
    type: "solid" | "gradient" | "image" | "transparent"
    color: string
    gradient: {
      type: "linear" | "radial"
      angle: number
      stops: { color: string; position: number }[]
    } | null
    image: ThemeImageFill | null
    /**
     * Lively animated background. When enabled on a gradient, the linear
     * angle rotates (or the radial center orbits) at `speed` degrees per
     * second. Absent/disabled means a static background. Ignored for
     * solid, image, and transparent backgrounds.
     */
    motion?: {
      enabled: boolean
      /** Degrees per second. */
      speed: number
    } | null
  }
  /**
   * The container holding the reference + verse block. Its fill can be a
   * colour or an image, and the text wraps inside it.
   */
  textBox: SurfaceFill
  verseText: {
    fontFamily: string
    fontSize: number
    fontWeight: number
    color: string
    horizontalAlign?: TextHorizontalAlign
    verticalAlign?: TextVerticalAlign
    textTransform?: TextTransform
    textDecoration?: TextDecoration
    lineHeight: number
    letterSpacing: number
    shadow: { color: string; blur: number; x: number; y: number } | null
    outline: { color: string; width: number } | null
    /** Optional plate behind the verse text alone. Absent means none. */
    surface?: SurfaceFill
  }
  verseNumbers: {
    visible: boolean
    fontSize: number
    color: string
    superscript: boolean
  }
  reference: {
    fontFamily: string
    fontSize: number
    fontWeight: number
    color: string
    horizontalAlign?: TextHorizontalAlign
    verticalAlign?: TextVerticalAlign
    textTransform?: TextTransform
    textDecoration?: TextDecoration
    uppercase: boolean
    letterSpacing: number
    position: "above" | "below" | "inline"
    /** Optional chip behind the reference alone. Absent means none. */
    surface?: SurfaceFill
  }
  layout: {
    anchor:
      | "center"
      | "top-left"
      | "top-center"
      | "top-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right"
    offsetX: number
    offsetY: number
    padding: { top: number; right: number; bottom: number; left: number }
    textAlign: "left" | "center" | "right"
    backgroundWidth: number
    backgroundHeight: number
    textAreaWidth: number
    textAreaHeight: number
    referenceGap?: number
    /** "stacked" (default): reference + verse flow as one block. "free": each is positioned by its box. */
    mode?: "stacked" | "free"
    referenceBox?: ElementBox
    verseBox?: ElementBox
  }
  transition: {
    type: "fade" | "slide" | "scale" | "none"
    duration: number
    easing: "linear" | "ease-in" | "ease-out" | "ease-in-out"
    direction: "up" | "down" | "left" | "right"
  }
}
