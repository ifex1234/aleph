export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const COLORS = {
  black: "#000000",
  near: "#050507",
  surface: "#0d0d10",
  surface2: "#15151a",
  line: "rgba(255,255,255,0.10)",
  lineStrong: "rgba(255,255,255,0.18)",
  white: "#ffffff",
  ink: "#f4f4f5",
  muted: "#9aa4b2",
  faint: "#6b7280",
  red: "#dc2626",
  redBright: "#fb2c36",
  redSoft: "#fca5a5",
  green: "#22c55e",
} as const;

/** 16:9 projector frame used across scenes. */
export const PROJECTOR = { x: 760, y: 214, w: 1040, h: 585 } as const;
