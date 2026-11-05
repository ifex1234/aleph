import type { NdiAlphaMode, NdiFrameRate, NdiResolution } from "./ndi"

export type BroadcastOutputType = "display" | "ndi"

/**
 * How a display output scales theme content onto its screen. Themes are
 * designed at a fixed resolution (usually 16:9), while monitors may have a
 * different aspect (e.g. 1280×1024 projector panels).
 */
export type BroadcastFitMode = "contain" | "fill" | "stretch"

export interface BroadcastOutputNdiSettings {
  sourceName: string
  resolution: NdiResolution
  frameRate: NdiFrameRate
  alphaMode: NdiAlphaMode
}

/**
 * Persisted configuration for one broadcast output. Whether the output is
 * currently on air (window open / NDI sender running) is runtime state,
 * reconciled from the OS — never persisted.
 */
export interface BroadcastOutput {
  /** "main" for the default output; crypto.randomUUID() otherwise. */
  id: string
  name: string
  type: BroadcastOutputType
  themeId: string
  /** Kept even while type === "ndi" so switching types is lossless. */
  monitorIndex: number
  ndi: BroadcastOutputNdiSettings
  /** Display outputs only: how content fits the screen. Defaults to "contain". */
  fitMode?: BroadcastFitMode
}

/** Runtime on-air state for an output, reconciled from the OS. */
export interface BroadcastOutputStatus {
  previewOpen: boolean
  ndiActive: boolean
}

/** The default output: always present, editable, never deletable. */
export const MAIN_OUTPUT_ID = "main"

export const outputWindowLabel = (id: string) => `broadcast-${id}`

export const defaultNdiSettings = (sourceName = "Aleph"): BroadcastOutputNdiSettings => ({
  sourceName,
  resolution: "r1080p",
  frameRate: "fps24",
  alphaMode: "straightAlpha",
})
