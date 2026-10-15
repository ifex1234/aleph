import { memo, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { BroadcastTheme, VerseSlide } from "@/types/broadcast"

interface VerseSlideRendererProps {
  theme: BroadcastTheme
  slide: VerseSlide | null
  className?: string
}

const resolveTextTransform = (
  value:
    | BroadcastTheme["verseText"]["textTransform"]
    | BroadcastTheme["reference"]["textTransform"]
    | undefined
): "none" | "uppercase" | "lowercase" | "capitalize" => value ?? "none"

const applyTextTransform = (
  text: string,
  transform: "none" | "uppercase" | "lowercase" | "capitalize"
): string => {
  switch (transform) {
    case "uppercase":
      return text.toUpperCase()
    case "lowercase":
      return text.toLowerCase()
    case "capitalize":
      return text.replace(/\b\w/g, (char) => char.toUpperCase())
    case "none":
    default:
      return text
  }
}

export const VerseSlideRenderer = memo(function VerseSlideRenderer({
  theme,
  slide,
  className,
}: VerseSlideRendererProps) {
  const vt = theme.verseText
  const ref = theme.reference
  const vn = theme.verseNumbers

  const verseTransform = useMemo(
    () => resolveTextTransform(vt.textTransform),
    [vt.textTransform]
  )
  const refTransform = useMemo(
    () => resolveTextTransform(ref.textTransform),
    [ref.textTransform]
  )

  if (!slide) {
    return (
      <div
        className={cn(
          "relative w-full h-full flex items-center justify-center",
          className
        )}
        style={{
          backgroundColor: theme.background.color,
          fontFamily: vt.fontFamily,
        }}
      >
        <div className="text-white/30 text-center px-8">
          No verse selected
        </div>
      </div>
    )
  }

  const verseText = applyTextTransform(slide.text, verseTransform)
  const referenceText = slide.reference
    ? applyTextTransform(
        ref.uppercase ? slide.reference.toUpperCase() : slide.reference,
        refTransform
      )
    : slide.label

  const verseFontSize = `clamp(2rem, 8vw, 6rem)`
  const referenceFontSize = `clamp(1rem, 3vw, 2.5rem)`

  const layout = theme.layout

  return (
    <div
      className={cn(
        "relative w-full h-full flex items-center justify-center",
        className
      )}
      style={{
        backgroundColor: theme.background.color,
        fontFamily: vt.fontFamily,
        padding: `${layout.padding.top}% ${layout.padding.right}% ${layout.padding.bottom}% ${layout.padding.left}%`,
      }}
    >
      {/* Background image/gradient would be handled by CSS or Canvas layer */}

      <div className="w-full h-full flex flex-col items-center justify-center px-4">
        {/* Reference at top or bottom based on theme */}
        {layout.referenceGap !== undefined && ref.position !== "inline" && (
          <div
            className={cn(
              "w-full text-center px-4 mb-4 transition-opacity duration-200",
              ref.position === "above" ? "order-1" : "order-3"
            )}
            style={{
              fontSize: referenceFontSize,
              fontWeight: ref.fontWeight,
              color: ref.color,
              fontFamily: ref.fontFamily,
              letterSpacing: ref.letterSpacing > 0 ? `${ref.letterSpacing}px` : undefined,
              textTransform: refTransform,
              opacity: 1,
            }}
          >
            {referenceText}
          </div>
        )}

        {/* Verse text - centered and scaled to fit */}
        <div
          className={cn(
            "w-full text-center leading-relaxed break-words px-4 transition-opacity duration-200",
            layout.referenceGap !== undefined && ref.position !== "inline"
              ? ref.position === "above"
                ? "order-2"
                : "order-1"
              : ""
          )}
          style={{
            fontSize: verseFontSize,
            lineHeight: vt.lineHeight,
            fontWeight: vt.fontWeight,
            color: vt.color,
            fontFamily: vt.fontFamily,
            letterSpacing: vt.letterSpacing > 0 ? `${vt.letterSpacing}px` : undefined,
            textTransform: verseTransform,
            maxWidth: "100%",
            textAlign: vt.horizontalAlign ?? layout.textAlign,
          }}
        >
          {verseText}
        </div>

        {/* Verse numbers if enabled */}
        {vn.visible && slide.verseNumber && (
          <div
            className="absolute top-4 left-4 text-white/60 font-mono text-sm"
            style={{
              fontSize: `${vn.fontSize}px`,
              color: vn.color,
            }}
          >
            {slide.verseNumber}
          </div>
        )}
      </div>
    </div>
  )
})