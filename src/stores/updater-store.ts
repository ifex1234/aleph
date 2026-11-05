import { invoke } from "@tauri-apps/api/core"
import { create } from "zustand"

export interface UpdaterUiState {
  /** False in dev builds and when the updater refuses to start. */
  enabled: boolean
  phase: "idle" | "available" | "downloading" | "ready"
  version: string
  percent: number
  /** Latest version the user closed the banner for — kept in localStorage. */
  dismissedVersion: string | null
}

interface UpdaterState extends UpdaterUiState {
  finalize: (state: UpdaterUiState) => void
  dismiss: () => void
  download: () => void
  install: () => void
  checkNow: () => Promise<void>
}

const DISMISSED_KEY = "aleph.updater.dismissedVersion"

function readDismissed(): string | null {
  try {
    return window.localStorage.getItem(DISMISSED_KEY)
  } catch {
    return null
  }
}

/**
 * The single copy of updater runtime state, fed by the main process via
 * `__updater_state` broadcasts and hydrated on mount via `__updater_get_state`
 * (the hydrate covers windows mounted after a broadcast was sent).
 */
export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  enabled: false,
  phase: "idle",
  version: "",
  percent: 0,
  dismissedVersion: readDismissed(),

  finalize: (next) => set(next),

  dismiss: () => {
    const { version } = get()
    if (version) {
      try {
        window.localStorage.setItem(DISMISSED_KEY, version)
      } catch {
        /* storage unavailable */
      }
    }
    set({ dismissedVersion: version ?? get().version })
  },

  download: () => {
    set({ phase: "downloading", percent: 0 })
    void invoke("__updater_download").catch(() => {})
  },

  install: () => {
    void invoke("__updater_install").catch(() => {})
  },

  checkNow: async () => {
    try {
      const next = await invoke<UpdaterUiState>("__updater_check")
      if (next) set({ ...next, dismissedVersion: get().dismissedVersion })
    } catch {
      // Dev builds and offline machines land here; state just stays.
    }
  },
}))

export const updaterStoreApi = {
  applyMainState: (next: UpdaterUiState) => {
    useUpdaterStore.setState((s) => ({ ...next, dismissedVersion: s.dismissedVersion }))
  },
}
