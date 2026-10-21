import { Easing, interpolate } from "remotion";

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Frame → 0..1 progress between two frames, clamped, eased. */
export const range = (
  frame: number,
  from: number,
  to: number,
  a = 0,
  b = 1,
  easing = EASE_OUT
) =>
  interpolate(frame, [from, to], [a, b], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Standard entrance: fade + rise + de-blur. Returns CSS props. */
export const enter = (frame: number, start: number, dur = 18) => {
  const p = range(frame, start, start + dur);
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * 26}px)`,
    filter: `blur(${(1 - p) * 10}px)`,
  } as const;
};

/** Exit: fade + slight lift. */
export const leave = (frame: number, start: number, dur = 14) => {
  const p = range(frame, start, start + dur);
  return {
    opacity: 1 - p,
    transform: `translateY(${p * -16}px)`,
    filter: `blur(${p * 8}px)`,
  } as const;
};

/** Pop: scale overshoot-free, used for buttons and badges. */
export const pop = (frame: number, start: number, dur = 16) => {
  const p = range(frame, start, start + dur);
  return {
    opacity: p,
    transform: `scale(${0.94 + p * 0.06})`,
  } as const;
};
