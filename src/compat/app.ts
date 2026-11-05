import { invoke } from "./core"

/**
 * Mirrors @tauri-apps/api/app#getVersion.
 *
 * The version is baked into the bundle at build time (`__APP_VERSION__`,
 * set from package.json in vite.config.ts) and only falls back to the
 * `__get_version` IPC call when that is missing, so it works even outside
 * the Electron webview.
 */
export function getVersion(): Promise<string> {
  if (typeof __APP_VERSION__ === "string" && __APP_VERSION__) {
    return Promise.resolve(__APP_VERSION__)
  }
  return invoke<string>("__get_version")
}

export function getName(): Promise<string> {
  return Promise.resolve("Aleph")
}

export function getTauriVersion(): Promise<string> {
  return Promise.resolve("electron")
}
