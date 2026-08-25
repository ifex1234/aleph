import { invoke } from "./core"

/**
 * Mirrors @tauri-apps/plugin-store. Each named store is one JSON file in the
 * app's data directory (settings.json, bible.json, broadcast-themes.json).
 */
export interface Store {
  get<T = unknown>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  save(): Promise<void>
  delete(key: string): Promise<void>
  reset(): Promise<void>
}

export interface StoreOptions {
  autoSave?: boolean
  defaults?: Record<string, unknown>
}

export async function load(path: string, options: StoreOptions = {}): Promise<Store> {
  // autoSave is accepted for API parity; writes are flushed by the main
  // process on set/save with its own debounce.
  void options
  return {
    get<T>(key: string) {
      return invoke<T | undefined>("__store_get", { store: path, key })
    },
    set(key, value) {
      return invoke<void>("__store_set", { store: path, key, value })
    },
    save() {
      return invoke<void>("__store_save", { store: path })
    },
    delete(key) {
      return invoke<void>("__store_delete", { store: path, key })
    },
    reset() {
      return invoke<void>("__store_reset", { store: path })
    },
  }
}
