import { invoke } from "./core"

/** Mirrors @tauri-apps/api/app#getVersion. */
export function getVersion(): Promise<string> {
  return invoke<string>("__get_version")
}

export function getName(): Promise<string> {
  return Promise.resolve("Aleph")
}

export function getTauriVersion(): Promise<string> {
  return Promise.resolve("electron")
}
