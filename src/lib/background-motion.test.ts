import { describe, expect, it } from "vitest"
import {
  DEFAULT_MOTION_SPEED,
  gradientBackgroundCss,
  isMotionEnabled,
  motionAngle,
  motionRadialCenter,
  motionSpeed,
  RADIAL_ORBIT_RADIUS,
} from "./background-motion"
import { BUILTIN_THEMES } from "./builtin-themes"
import type { BroadcastTheme } from "@/types/broadcast"

function gradientTheme(
  motion: BroadcastTheme["background"]["motion"] = {
    enabled: true,
    speed: 12,
  }
): BroadcastTheme {
  const base = BUILTIN_THEMES[0]
  return {
    ...base,
    background: {
      type: "gradient",
      color: "#000000",
      gradient: {
        type: "linear",
        angle: 90,
        stops: [
          { color: "#000000", position: 0 },
          { color: "#ffffff", position: 100 },
        ],
      },
      image: null,
      motion,
    },
  }
}

describe("motionSpeed", () => {
  it("passes sane speeds through", () => {
    expect(motionSpeed({ enabled: true, speed: 30 })).toBe(30)
  })

  it("falls back for missing or corrupt speeds", () => {
    expect(motionSpeed(null)).toBe(DEFAULT_MOTION_SPEED)
    expect(motionSpeed(undefined)).toBe(DEFAULT_MOTION_SPEED)
    expect(motionSpeed({ enabled: true, speed: NaN })).toBe(
      DEFAULT_MOTION_SPEED
    )
    expect(motionSpeed({ enabled: true, speed: Infinity })).toBe(
      DEFAULT_MOTION_SPEED
    )
  })

  it("clamps to zero at the bottom and caps the top", () => {
    expect(motionSpeed({ enabled: true, speed: -5 })).toBe(0)
    expect(motionSpeed({ enabled: true, speed: 1000 })).toBe(360)
  })
})

describe("isMotionEnabled", () => {
  it("is on for animated gradients", () => {
    expect(isMotionEnabled(gradientTheme())).toBe(true)
  })

  it("is off without motion, when disabled, or at zero speed", () => {
    expect(isMotionEnabled(gradientTheme(null))).toBe(false)
    expect(
      isMotionEnabled(gradientTheme({ enabled: false, speed: 12 }))
    ).toBe(false)
    expect(isMotionEnabled(gradientTheme({ enabled: true, speed: 0 }))).toBe(
      false
    )
  })

  it("never applies to non-gradient backgrounds", () => {
    const base = BUILTIN_THEMES[1] // solid
    expect(
      isMotionEnabled({
        ...base,
        background: {
          ...base.background,
          motion: { enabled: true, speed: 12 },
        },
      })
    ).toBe(false)
  })
})

describe("motionAngle", () => {
  it("holds the base angle when motion is off", () => {
    expect(motionAngle(90, null, 5000)).toBe(90)
    expect(motionAngle(90, { enabled: false, speed: 12 }, 5000)).toBe(90)
  })

  it("rotates by speed over time and wraps past 360", () => {
    // 12°/s for 5s from 90° lands on 150°.
    expect(motionAngle(90, { enabled: true, speed: 12 }, 5000)).toBeCloseTo(
      150,
      9
    )
    // 12°/s for 30s from 90° wraps: 90 + 360 → 90.
    expect(motionAngle(90, { enabled: true, speed: 12 }, 30000)).toBeCloseTo(
      90,
      9
    )
  })

  it("treats bad clocks as a standstill frame", () => {
    expect(motionAngle(90, { enabled: true, speed: 12 }, NaN)).toBe(90)
    expect(motionAngle(90, { enabled: true, speed: 12 }, -100)).toBe(90)
  })
})

describe("motionRadialCenter", () => {
  it("sits dead center without motion", () => {
    expect(motionRadialCenter(null, 5000)).toEqual({ x: 0.5, y: 0.5 })
  })

  it("orbits at a fixed radius", () => {
    const a = motionRadialCenter({ enabled: true, speed: 12 }, 0)
    const b = motionRadialCenter({ enabled: true, speed: 12 }, 7500)
    for (const p of [a, b]) {
      const r = Math.hypot(p.x - 0.5, p.y - 0.5)
      expect(r).toBeCloseTo(RADIAL_ORBIT_RADIUS, 9)
    }
    // ...and actually moves between frames.
    expect(a.x).not.toBeCloseTo(b.x, 3)
  })
})

describe("gradientBackgroundCss", () => {
  it("renders a static linear gradient at time zero", () => {
    const theme = gradientTheme(null)
    expect(
      gradientBackgroundCss(theme.background.gradient!, null, 0)
    ).toBe("linear-gradient(90deg, #000000 0%, #ffffff 100%)")
  })

  it("rotates the CSS angle with the clock", () => {
    const theme = gradientTheme()
    expect(
      gradientBackgroundCss(
        theme.background.gradient!,
        theme.background.motion,
        5000
      )
    ).toBe("linear-gradient(150deg, #000000 0%, #ffffff 100%)")
  })

  it("positions the radial highlight off-center when animated", () => {
    const theme = gradientTheme()
    const radial = { ...theme.background.gradient!, type: "radial" as const }
    const css = gradientBackgroundCss(radial, theme.background.motion, 0)
    expect(css).toBe(
      "radial-gradient(circle at 58.00% 50.00%, #000000 0%, #ffffff 100%)"
    )
  })
})
