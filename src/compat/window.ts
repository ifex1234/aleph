import { invoke } from "./core"

export interface PhysicalPosition {
  x: number
  y: number
}

export interface PhysicalSize {
  width: number
  height: number
}

/** Subset of @tauri-apps/api/dpi types used by this app. */
export interface Monitor {
  name: string | null
  size: PhysicalSize
  position: PhysicalPosition
  workArea: {
    x: number
    y: number
    width: number
    height: number
  }
  scale_factor: number
}

interface WindowHandle {
  label: string
  isVisible(): Promise<boolean>
}

/**
 * Mirrors @tauri-apps/api/window#getAllWindows — every app window including
 * hidden NDI output windows.
 */
export async function getAllWindows(): Promise<WindowHandle[]> {
  const list = await invoke<Array<{ label: string; visible: boolean }>>(
    "__get_all_windows"
  )
  return list.map((w) => ({
    label: w.label,
    isVisible: () => Promise.resolve(w.visible),
  }))
}

/** Mirrors @tauri-apps/api/window#availableMonitors. */
export async function availableMonitors(): Promise<Monitor[]> {
  return invoke<Monitor[]>("list_monitors")
}

export const currentMonitor = async (): Promise<Monitor | null> => null
export const primaryMonitor = async (): Promise<Monitor | null> => null

export type WindowEvent =
  | "closeRequested"
  | "closed"
  | "focus"
  | "blur"
  | "resized"
  | "moved"
