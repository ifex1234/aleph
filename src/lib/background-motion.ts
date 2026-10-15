import type { BroadcastTheme } from "@/types/broadcast"

/** Degrees per second when the user enables motion without picking a speed. */
export const DEFAULT_MOTION_SPEED = 12

/** Hard clamp so a corrupt saved theme can't spin absurdly fast. */
export const MAX_MOTION_SPEED = 360

/** Fraction of the frame the radial center orbits around the middle. */
export const RADIAL_ORBIT_RADIUS = 0.08

/** Sanitized, always-finite degrees-per-second value. */
export function motionSpeed(
  motion: BroadcastTheme["background"]["motion"]
): number {
  const speed = motion?.speed
  if (typeof speed !== "number" || !Number.isFinite(speed)) {
    return DEFAULT_MOTION_SPEED
  }
  return Math.min(MAX_MOTION_SPEED, Math.max(0, speed))
}

/** Motion only ever applies to gradients. */
export function isMotionEnabled(theme: BroadcastTheme): boolean {
  const bg = theme.background
  return (
    bg.type === "gradient" &&
    bg.gradient !== null &&
    bg.motion?.enabled === true &&
    motionSpeed(bg.motion) > 0
  )
}

/**
 * Effective linear-gradient angle in degrees at `timeMs`. Rotates forever;
 * callers pass it straight into their angle-to-vector math.
 */
export function motionAngle(
  baseAngle: number,
  motion: BroadcastTheme["background"]["motion"],
  timeMs: number
): number {
  const base = Number.isFinite(baseAngle) ? baseAngle : 0
  if (!motion?.enabled) return base
  const t = Number.isFinite(timeMs) ? Math.max(0, timeMs) : 0
  return (base + (t / 1000) * motionSpeed(motion)) % 360
}

/**
 * Radial gradient center as fractions of the frame (0..1) at `timeMs`.
 * Orbits a small circle around the middle so the highlight drifts instead
 * of sitting dead center. Matches the canvas drift in drawBackground.
 */
export function motionRadialCenter(
  motion: BroadcastTheme["background"]["motion"],
  timeMs: number
): { x: number; y: number } {
  if (!motion?.enabled) return { x: 0.5, y: 0.5 }
  const t = Number.isFinite(timeMs) ? Math.max(0, timeMs) : 0
  const theta = ((t / 1000) * motionSpeed(motion) * Math.PI) / 180
  return {
    x: 0.5 + RADIAL_ORBIT_RADIUS * Math.cos(theta),
    y: 0.5 + RADIAL_ORBIT_RADIUS * Math.sin(theta),
  }
}

/** CSS `background` value for an animated (or static) theme gradient. */
export function gradientBackgroundCss(
  gradient: NonNullable<BroadcastTheme["background"]["gradient"]>,
  motion: BroadcastTheme["background"]["motion"],
  timeMs: number
): string {
  const stops = gradient.stops
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ")
  if (gradient.type === "linear") {
    return `linear-gradient(${motionAngle(gradient.angle, motion, timeMs)}deg, ${stops})`
  }
  const center = motionRadialCenter(motion, timeMs)
  return `radial-gradient(circle at ${(center.x * 100).toFixed(2)}% ${(center.y * 100).toFixed(2)}%, ${stops})`
}

/** Whether animation loops should run at all in this environment. */
export function allowBackgroundMotion(): boolean {
  return (
    typeof matchMedia === "undefined" ||
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}
