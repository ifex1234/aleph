import { invoke } from "./core"

/**
 * Mirrors the subset of @tauri-apps/plugin-fs the app uses. Paths are plain
 * filesystem paths returned by the dialog shims.
 */
export async function readFile(path: string): Promise<Uint8Array> {
  const buffer = await invoke<ArrayBuffer>("__fs_read_file", { path })
  return new Uint8Array(buffer)
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  await invoke("__fs_write_text_file", { path, contents })
}
