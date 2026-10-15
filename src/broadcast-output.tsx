import { createRoot } from "react-dom/client"
import { useRef, useEffect, useCallback, useState, useMemo } from "react"
import { invoke } from "@tauri-apps/api/core"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import { onThemeFontsLoaded, renderVerse, drawBackground } from "@/lib/verse-renderer"
import { isMotionEnabled, allowBackgroundMotion } from "@/lib/background-motion"
import { verseSlideToRenderData } from "@/lib/verse-navigation"
import { preloadThemeImages, themeImageCache } from "@/lib/theme-image-cache"
import { normalizeTheme } from "@/lib/theme-migrations"
import { VerseSlides } from "@/components/ui/verse-slides"
import { LyricsSlides } from "@/components/ui/lyrics-slides"
import { ImageSlides } from "@/components/ui/image-slides"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import "./broadcast-fonts.css"
import type { BroadcastTheme, BroadcastContent, TimerContent, LyricsContent, LyricsSlideContent } from "@/types/broadcast"
import type { NdiConfigEventPayload, NdiFrameRequest } from "@/types"

/** Convert Uint8Array/Uint8ClampedArray to base64 using Function.apply (avoids spread stack overflow) */
function uint8ToBase64(bytes: Uint8Array | Uint8ClampedArray): string {
  const CHUNK = 0x8000 // 32KB — safe for Function.apply
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(
      String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + CHUNK) as unknown as number[],
      ),
    )
  }
  return btoa(parts.join(""))
}

/** Read output ID from URL query param (?output=main or ?output=alt). Defaults to "main". */
const OUTPUT_ID = new URLSearchParams(window.location.search).get("output") ?? "main"

/** Motion frames pushed to NDI at this interval (10fps bounds CPU/base64 cost). */
const MOTION_NDI_INTERVAL_MS = 100

interface BroadcastPayload {
  theme: BroadcastTheme
  content: BroadcastContent
}

export function BroadcastOutput() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Hidden full-resolution canvas feeding NDI. Unlike the display canvas
  // (mounted only for canvas-drawn content), this is always mounted so NDI
  // carries every content type, including DOM-rendered slides.
  const captureRef = useRef<HTMLCanvasElement>(null)
  const slideImageCacheRef = useRef(new Map<string, HTMLImageElement>())
  const [latestData, setLatestData] = useState<BroadcastPayload | null>(null)
  const ndiConfigRef = useRef<NdiConfigEventPayload>({
    active: false,
    fps: 24,
    width: 1920,
    height: 1080,
  })
  const ndiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastPushRef = useRef(0)
  const pushingRef = useRef(false)
  const pushNdiBurstRef = useRef<(() => void) | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const logDebug = useCallback((message: string, meta?: unknown) => {
    if (!import.meta.env.DEV) return
    if (meta === undefined) {
      console.debug(`[broadcast-output] ${message}`)
      return
    }
    console.debug(`[broadcast-output] ${message}`, meta)
  }, [])

  // Measure container size with ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const drawTimer = useCallback((
    ctx: CanvasRenderingContext2D,
    theme: BroadcastTheme,
    timer: TimerContent
  ) => {
    const { displayMs, isRunning, isCritical, isExpired } = timer

    ctx.fillStyle = theme.background.color || "#000"
    ctx.fillRect(0, 0, theme.resolution.width, theme.resolution.height)

    const totalSec = Math.floor(displayMs / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    const ms = Math.floor((displayMs % 1000) / 10)
    const timeStr = h > 0
      ? `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`

    const fontSize = Math.min(theme.resolution.width, theme.resolution.height) * 0.15
    const font = `700 ${fontSize}px "Inter", "Helvetica Neue", sans-serif`

    ctx.save()
    ctx.font = font
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const x = theme.resolution.width / 2
    const y = theme.resolution.height / 2

    ctx.strokeStyle = "#000"
    ctx.lineWidth = fontSize * 0.08
    ctx.strokeText(timeStr, x, y)

    ctx.fillStyle = isExpired || isCritical ? "#dc2626" : "#fff"
    ctx.fillText(timeStr, x, y)

    if (isRunning) {
      const dotRadius = 12
      const dotX = x
      const dotY = y + fontSize * 0.8
      const pulse = (Math.sin(Date.now() / 200) + 1) / 2
      ctx.fillStyle = `rgba(34, 197, 94, ${0.6 + pulse * 0.4})`
      ctx.beginPath()
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }, [])

  const drawLyrics = useCallback((
    ctx: CanvasRenderingContext2D,
    theme: BroadcastTheme,
    lyrics: LyricsContent | LyricsSlideContent,
    timeMs?: number
  ) => {
    const fullRect = { x: 0, y: 0, width: theme.resolution.width, height: theme.resolution.height }
    drawBackground(ctx, theme, fullRect, themeImageCache(), timeMs)

    // Handle both old LyricsContent and new LyricsSlideContent
    const isSlideContent = "verses" in lyrics
    const lines = isSlideContent ? lyrics.verses.map((v: { text: string }) => v.text) : lyrics.lines
    const currentLineIndex = isSlideContent ? lyrics.currentVerseIndex : lyrics.currentLineIndex
    const title = lyrics.title
    const author = "author" in lyrics ? lyrics.author : undefined

    if (lines.length === 0) return

    // Calculate font size based on resolution - smaller to fit more text
    const baseFontSize = Math.min(theme.resolution.width, theme.resolution.height) * 0.045
    const fontSize = Math.max(24, Math.min(72, baseFontSize))
    const lineHeight = fontSize * 1.4
    const font = `400 ${fontSize}px "${theme.verseText.fontFamily}", "Helvetica Neue", sans-serif`
    const currentFont = `600 ${fontSize * 1.1}px "${theme.verseText.fontFamily}", "Helvetica Neue", sans-serif`

    // Text wrapping helper
    const wrapText = (text: string, maxWidth: number): string[] => {
      const words = text.split(" ")
      const lines: string[] = []
      let currentLine = ""
      
      ctx.font = font
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const metrics = ctx.measureText(testLine)
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) lines.push(currentLine)
      return lines
    }

    const maxWidth = theme.resolution.width * 0.85
    ctx.save()
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Calculate total height needed for all wrapped lines
    const wrappedLines: string[][] = lines.map(line => wrapText(line, maxWidth))
    const totalLineCount = wrappedLines.reduce((sum, w) => sum + w.length, 0)
    const totalHeight = totalLineCount * lineHeight
    let startY = (theme.resolution.height - totalHeight) / 2

    wrappedLines.forEach((wrapped: string[], lineIndex: number) => {
      wrapped.forEach((wrappedLine) => {
        const y = startY + lineHeight / 2
        if (lineIndex === currentLineIndex) {
          ctx.font = currentFont
          ctx.fillStyle = "#fff"
        } else {
          ctx.font = font
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        }
        ctx.fillText(wrappedLine, theme.resolution.width / 2, y)
        startY += lineHeight
      })
    })

    // Draw title and author (like song label)
    const labelParts: string[] = []
    if (title) labelParts.push(title)
    if (author) labelParts.push(author)
    if (labelParts.length > 0) {
      ctx.font = `500 ${fontSize * 0.7}px "${theme.verseText.fontFamily}", sans-serif`
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
      const titleY = (theme.resolution.height - totalHeight) / 2 - fontSize * 0.8
      ctx.fillText(labelParts.join(" • "), theme.resolution.width / 2, titleY)
    }

    ctx.restore()
  }, [])

  const drawRef = useRef<(timeMs?: number) => void>(() => {})

  const getSlideImage = useCallback((dataUrl: string): HTMLImageElement | null => {
    if (typeof Image === "undefined") return null
    let img = slideImageCacheRef.current.get(dataUrl)
    if (!img) {
      img = new Image()
      slideImageCacheRef.current.set(dataUrl, img)
      img.onload = () => {
        drawRef.current()
        pushNdiBurstRef.current?.()
      }
      img.src = dataUrl
    }
    return img
  }, [])

  const drawImageSlide = useCallback((
    ctx: CanvasRenderingContext2D,
    theme: BroadcastTheme,
    slide: { dataUrl: string; name: string }
  ) => {
    const { width, height } = theme.resolution
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, width, height)
    const img = getSlideImage(slide.dataUrl)
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      // Not yet decoded (or not an image at all, e.g. video/PDF): label the
      // frame instead of leaving a mystery black void.
      ctx.save()
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
      ctx.font = `500 ${Math.max(24, height * 0.04)}px "Inter", "Helvetica Neue", sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(slide.name || "Slide", width / 2, height / 2)
      ctx.restore()
      return
    }
    // Cover fit, centered.
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight)
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh)
  }, [getSlideImage])

  const paintContent = useCallback((
    canvas: HTMLCanvasElement,
    theme: BroadcastTheme,
    content: BroadcastContent,
    timeMs?: number
  ) => {
    canvas.width = theme.resolution.width
    canvas.height = theme.resolution.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    switch (content.type) {
      case "verse": {
        if (content.verseSlides && content.verseSlides.slides.length > 0) {
          const slides = content.verseSlides.slides
          const index = Math.min(
            Math.max(0, content.verseSlides.currentSlideIndex),
            slides.length - 1
          )
          const result = renderVerse(ctx, theme, verseSlideToRenderData(slides[index]), {
            scale: 1,
            imageCache: themeImageCache(),
            timeMs,
          })
          if (!result) {
            ctx.fillStyle = "#000"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            logDebug("renderVerse returned null; drew fallback frame")
          }
          break
        }
        const result = renderVerse(ctx, theme, content.verse ?? null, {
          scale: 1,
          imageCache: themeImageCache(),
          timeMs,
        })
        if (!result) {
          ctx.fillStyle = "#000"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          logDebug("renderVerse returned null; drew fallback frame")
        }
        break
      }
      case "timer":
        if (content.timer) drawTimer(ctx, theme, content.timer)
        break
      case "lyrics":
        if (content.lyricsSlide) drawLyrics(ctx, theme, content.lyricsSlide, timeMs)
        else if (content.lyrics) drawLyrics(ctx, theme, content.lyrics, timeMs)
        break
      case "slides": {
        const deck = content.slides
        if (deck && deck.slides.length > 0) {
          const index = Math.min(Math.max(0, deck.currentSlideIndex), deck.slides.length - 1)
          drawImageSlide(ctx, theme, deck.slides[index])
        } else {
          ctx.fillStyle = "#000"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
        break
      }
      case "blank":
      default:
        ctx.fillStyle = theme.background.color || "#000"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        break
    }
  }, [logDebug, drawTimer, drawLyrics, drawImageSlide])

  const draw = useCallback((timeMs?: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = latestData
    if (!data) {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }

    const { theme, content } = data
    paintContent(canvas, theme, content, timeMs)
  }, [latestData, paintContent])

  /** Paint the always-mounted NDI capture canvas (carries every content type). */
  const drawCapture = useCallback((timeMs?: number) => {
    const canvas = captureRef.current
    if (!canvas) return
    const data = latestData
    if (!data) {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }

    const { theme, content } = data
    paintContent(canvas, theme, content, timeMs)
  }, [latestData, paintContent])

  const preloadThemeAssets = useCallback((theme: BroadcastTheme) => {
    preloadThemeImages(theme, () => {
      logDebug("Theme images loaded")
      draw()
      drawCapture()
      pushNdiBurstRef.current?.()
    })
  }, [draw, drawCapture, logDebug])

  useEffect(() => {
    drawRef.current = (timeMs?: number) => draw(timeMs)
  }, [draw])

  const pushNdiFrame = useCallback(async () => {
    if (!ndiConfigRef.current.active) return
    if (pushingRef.current) return
    pushingRef.current = true

    try {
      const canvas = captureRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const targetWidth = ndiConfigRef.current.width
      const targetHeight = ndiConfigRef.current.height

      let sourceCtx = ctx
      let sourceWidth = canvas.width
      let sourceHeight = canvas.height

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        const ndiCanvas = ndiCanvasRef.current ?? document.createElement("canvas")
        ndiCanvas.width = targetWidth
        ndiCanvas.height = targetHeight
        const ndiCtx = ndiCanvas.getContext("2d")
        if (!ndiCtx) return
        ndiCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight)
        ndiCanvasRef.current = ndiCanvas
        sourceCtx = ndiCtx
        sourceWidth = targetWidth
        sourceHeight = targetHeight
      }

      const imageData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight)
      const rgbaBase64 = uint8ToBase64(imageData.data)

      const request: NdiFrameRequest = {
        outputId: OUTPUT_ID,
        width: sourceWidth,
        height: sourceHeight,
        rgbaBase64,
      }

      await invoke("push_ndi_frame", { request })
      lastPushRef.current = Date.now()
    } catch (error) {
      console.warn("[broadcast-output] push_ndi_frame failed", error)
    } finally {
      pushingRef.current = false
    }
  }, [])

  const pushNdiBurst = useCallback(() => {
    void pushNdiFrame()
    setTimeout(() => void pushNdiFrame(), 150)
    setTimeout(() => void pushNdiFrame(), 300)
  }, [pushNdiFrame])

  useEffect(() => {
    pushNdiBurstRef.current = pushNdiBurst
  }, [pushNdiBurst])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = 1920
      canvas.height = 1080
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, 1920, 1080)
      }
    }

    const currentWindow = getCurrentWebviewWindow()
    logDebug("Listener registration started", { label: currentWindow.label })
    const unlisten = currentWindow.listen<BroadcastPayload>("broadcast:content-update", (event) => {
      const normalizedPayload = {
        ...event.payload,
        theme: normalizeTheme(event.payload.theme),
      }
      setLatestData(normalizedPayload)
      preloadThemeAssets(event.payload.theme)
      logDebug("Received broadcast:content-update", {
        type: event.payload.content.type,
        themeId: event.payload.theme.id,
      })
      draw()
      drawCapture()
      pushNdiBurst()
    })

    const unlistenNdiConfig = currentWindow.listen<NdiConfigEventPayload>("broadcast:ndi-config", (event) => {
      ndiConfigRef.current = event.payload
      logDebug("Received broadcast:ndi-config", event.payload)
      if (event.payload.active) pushNdiBurst()
    })

    void invoke<{ active: boolean; width: number; height: number; fps: number } | null>("get_ndi_status", { outputId: OUTPUT_ID })
      .then((status) => {
        if (status && status.active) {
          ndiConfigRef.current = {
            active: true,
            fps: status.fps,
            width: status.width,
            height: status.height,
          }
          logDebug("Fetched NDI status on mount", status)
        }
      })
      .catch(() => {})

    const unsubscribeFonts = onThemeFontsLoaded(() => {
      draw()
      drawCapture()
      pushNdiBurst()
    })

    void currentWindow.emitTo("main", "broadcast:output-ready", { outputId: OUTPUT_ID }).then(() => {
      logDebug("Sent broadcast:output-ready")
    }).catch(() => {
      console.warn("[broadcast-output] failed to send output-ready event")
    })

    return () => {
      unsubscribeFonts()
      unlisten.then((fn) => fn())
      unlistenNdiConfig.then((fn) => fn())
    }
  }, [draw, drawCapture, logDebug, preloadThemeAssets, pushNdiFrame, pushNdiBurst])

  useEffect(() => {
    const timer = setInterval(() => {
      if (!ndiConfigRef.current.active) return
      const elapsed = Date.now() - lastPushRef.current
      if (elapsed > 2000) void pushNdiFrame()
    }, 2000)
    return () => clearInterval(timer)
  }, [pushNdiFrame])

  // Motion backgrounds on NDI: redraw + push throttled frames while an
  // animated theme is showing. Static content keeps the existing
  // burst + keepalive behavior above.
  const motionNdiActive =
    !!latestData &&
    isMotionEnabled(latestData.theme) &&
    allowBackgroundMotion()
  useEffect(() => {
    if (!motionNdiActive) return
    const timer = setInterval(() => {
      if (!ndiConfigRef.current.active) return
      drawCapture(performance.now())
      void pushNdiFrame()
    }, MOTION_NDI_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [motionNdiActive, drawCapture, pushNdiFrame])

  const theme = latestData?.theme
  const content = latestData?.content

  // Determine if we should use slide-based rendering for verses
  const useSlidesForVerses = content?.type === "verse" && content.verseSlides && content.verseSlides.slides.length > 0

  const aspectRatio = theme?.resolution.width ? theme.resolution.width / theme.resolution.height : 16/9
  const displayWidth = containerSize.width || theme?.resolution.width || 1920
  const displayHeight = displayWidth / aspectRatio

  const containerStyle = useMemo(() => ({
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme?.background.color || "#000",
    overflow: "hidden",
  } as React.CSSProperties), [theme?.background.color])

  const contentStyle = useMemo(() => ({
    width: displayWidth,
    height: displayHeight,
  } as React.CSSProperties), [displayWidth, displayHeight])

  if (!theme) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-black"
        style={{ width: "100vw", height: "100vh" }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    )
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      {/* Hidden full-resolution canvas feeding NDI for every content type. */}
      <canvas ref={captureRef} aria-hidden="true" style={{ display: "none" }} />
      {useSlidesForVerses && content?.verseSlides ? (
        // Slide-based verse rendering (Cloud of Worship style)
        <div style={contentStyle}>
          <VerseSlides
            theme={theme}
            content={content.verseSlides}
            isLive={true}
            transitionDuration={theme.transition?.duration ?? 300}
            transitionType={theme.transition?.type === "slide" ? "slide" : "fade"}
          />
        </div>
      ) : content?.type === "verse" && content.verse ? (
        // Canvas-based verse rendering (original approach)
        <div style={contentStyle}>
          <CanvasVerse theme={theme} verse={content.verse} />
        </div>
      ) : content?.type === "lyrics" && content.lyricsSlide ? (
        // Slide-based lyrics rendering (Cloud of Worship style)
        <div style={contentStyle}>
          <LyricsSlides
            theme={theme}
            content={content.lyricsSlide}
            isLive={true}
            transitionDuration={theme.transition?.duration ?? 300}
            transitionType={theme.transition?.type === "slide" ? "slide" : "fade"}
          />
        </div>
      ) : content?.type === "slides" && content.slides ? (
        // Image slides (announcements, presentations)
        <div style={contentStyle}>
          <ImageSlides
            content={content.slides}
            isLive={true}
            transitionDuration={theme.transition?.duration ?? 300}
          />
        </div>
      ) : (
        // Canvas-based rendering for timer, lyrics (legacy), blank
        <div style={contentStyle}>
          <canvas
            ref={canvasRef}
            width={theme.resolution.width}
            height={theme.resolution.height}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}
    </div>
  )
}

const root = document.getElementById("broadcast-root")!
createRoot(root).render(<BroadcastOutput />)