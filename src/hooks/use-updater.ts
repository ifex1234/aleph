import { useEffect } from "react"
import { listen } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/core"
import { updaterStoreApi, useUpdaterStore } from "@/stores/updater-store"
import type { UpdaterUiState } from "@/stores/updater-store"

/**
 * Hydrates updater state on mount and keeps it current from main-process
 * broadcasts. Mounted once from App; any window (also Help tab card) reads
 * the same zustand state afterwards.
 */
export function useUpdaterEvents(): void {
  useEffect(() => {
    void invoke<UpdaterUiState>("__updater_get_state")
      .then((state) => {
        if (state) updaterStoreApi.applyMainState(state)
      })
      .catch(() => {
        // Dev builds / bridge missing — the card will say updates only apply
        // to installed builds once it knows enabled=false; before that, idle.
      })

    let unlisten: (() => void) | undefined = undefined
    void listen<UpdaterUiState>("__updater_state", (event) => {
      updaterStoreApi.applyMainState(event.payload)
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      unlisten?.()
    }
  }, [])
}

export function useUpdater() {
  return useUpdaterStore()
}
