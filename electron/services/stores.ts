import fs from "node:fs"
import path from "node:path"
import { userDataDir } from "./paths"
import { error } from "./logger"

/**
 * JSON file stores standing in for tauri-plugin-store. Same file names as
 * before (settings.json, bible.json, broadcast-themes.json) so existing user
 * data directories keep working.
 */
const stores = new Map<string, Map<string, unknown>>()
const dirty = new Set<string>()

function storeFile(name: string): string {
  // Only allow plain file names — stores live in one directory.
  const safe = path.basename(name)
  if (safe !== name || name.includes("/") || name.includes("\\")) {
    throw new Error(`Invalid store name: ${name}`)
  }
  return path.join(userDataDir(), safe.endsWith(".json") ? safe : `${safe}.json`)
}

function loadStore(name: string): Map<string, unknown> {
  let store = stores.get(name)
  if (store) return store
  store = new Map()
  try {
    const raw = fs.readFileSync(storeFile(name), "utf8")
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const [k, v] of Object.entries(parsed)) store.set(k, v)
  } catch {
    // Missing or corrupt file: start empty.
  }
  stores.set(name, store)
  return store
}

/** Write every dirty store to disk. Called on a debounce and at quit. */
export function flushStores(): void {
  for (const name of dirty) {
    dirty.delete(name)
    const store = loadStore(name)
    const obj: Record<string, unknown> = {}
    for (const [k, v] of store) obj[k] = v
    const file = storeFile(name)
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, JSON.stringify(obj, null, 2))
    } catch (e) {
      error(`[stores] failed writing ${file}:`, e)
    }
  }
}

let flushTimer: NodeJS.Timeout | null = null

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushStores()
  }, 150)
}

export function storeGet(name: string, key: string): unknown {
  return loadStore(name).get(key)
}

export function storeSet(name: string, key: string, value: unknown): void {
  loadStore(name).set(key, value)
  dirty.add(name)
  scheduleFlush()
}

export function storeDelete(name: string, key: string): void {
  loadStore(name).delete(key)
  dirty.add(name)
  scheduleFlush()
}

export function storeSave(name: string): void {
  dirty.add(name)
  flushStores()
}

export function storeReset(name: string): void {
  loadStore(name).clear()
  dirty.add(name)
  scheduleFlush()
}
