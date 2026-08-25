import { bridge } from "./bridge"

/** Mirrors @tauri-apps/api/core#invoke — same command names, same payloads. */
export async function invoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  return (await bridge().invoke(cmd, args)) as T
}

export const convertFileSrc = (filePath: string): string => `file://${filePath}`

export const isTauri = (): boolean => true
