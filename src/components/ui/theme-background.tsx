import { useEffect, useRef, useState, memo } from "react"
import { loadThemeImage } from "@/lib/theme-image-cache"
import {
  allowBackgroundMotion,
  gradientBackgroundCss,
  isMotionEnabled,
} from "@/lib/background-motion"
import type { BroadcastTheme } from "@/types/broadcast"

interface ThemeBackgroundProps {
  theme: BroadcastTheme
  className?: string
}

export const ThemeBackground = memo(function ThemeBackground({ theme, className }: ThemeBackgroundProps) {
  const bg = theme.background
  const elRef = useRef<HTMLDivElement>(null)
  const [backgroundStyle, setBackgroundStyle] = useState<React.CSSProperties>({ backgroundColor: bg.color })

  useEffect(() => {
    let mounted = true

    const applyBackground = async () => {
      switch (bg.type) {
        case "solid":
          if (mounted) {
            setBackgroundStyle({ backgroundColor: bg.color })
          }
          break

        case "gradient": {
          if (!bg.gradient || !mounted) return
          let gradient: string
          if (bg.gradient.type === "linear") {
            const angle = bg.gradient.angle
            gradient = `linear-gradient(${angle}deg, ${bg.gradient.stops
              .map((s) => `${s.color} ${s.position}%`)
              .join(", ")})`
          } else {
            gradient = `radial-gradient(circle, ${bg.gradient.stops
              .map((s) => `${s.color} ${s.position}%`)
              .join(", ")})`
          }
          if (mounted) {
            setBackgroundStyle({ background: gradient })
          }
          break
        }

        case "image": {
          if (!bg.image || !mounted) return
          const img = await loadThemeImage(bg.image.url)
          if (!mounted) return

          if (img) {
            const { fit, blur, brightness, tint } = bg.image
            let backgroundSize = "cover"
            if (fit === "contain") backgroundSize = "contain"
            else if (fit === "stretch") backgroundSize = "100% 100%"

            let filter = ""
            if (blur > 0) filter += `blur(${blur}px) `
            if (brightness !== 100) filter += `brightness(${brightness / 100}) `

            if (mounted) {
              setBackgroundStyle({
                backgroundImage: `url(${bg.image.url})`,
                backgroundSize,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                filter: filter.trim() || undefined,
                backgroundColor: tint ?? bg.color,
              })
            }
          } else {
            if (mounted) {
              setBackgroundStyle({ backgroundColor: bg.image.tint ?? bg.color })
            }
          }
          break
        }

        case "transparent":
          if (mounted) {
            setBackgroundStyle({ backgroundColor: "transparent" })
          }
          break
      }
    }

    applyBackground()
    return () => {
      mounted = false
    }
  }, [bg])

  // Lively animated gradient background: repaint every frame with the same
  // math as the canvas renderer. Writes straight to the element so React
  // never re-renders at frame rate. Static when motion is off.
  useEffect(() => {
    const el = elRef.current
    if (
      !el ||
      bg.type !== "gradient" ||
      !bg.gradient ||
      !isMotionEnabled(theme) ||
      !allowBackgroundMotion()
    ) {
      return
    }
    const gradient = bg.gradient
    const motion = bg.motion ?? null
    let raf = 0
    const tick = () => {
      el.style.background = gradientBackgroundCss(gradient, motion, performance.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [theme, bg])

  return <div ref={elRef} className={className} style={backgroundStyle} />
})