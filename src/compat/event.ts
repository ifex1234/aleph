import { bridge } from "./bridge"

export type UnlistenFn = () => void

export interface Event<T> {
  event: string
  id: number
  payload: T
}

type Handler<T> = (event: Event<T>) => void

interface Entry {
  id: number
  event: string
  wrapped: Handler<unknown>
}

const listeners = new Set<Entry>()
let nextId = 1
let globalRegistered = false

function ensureGlobalListener(): void {
  // Registers one channel from the preload bridge and fans each incoming
  // (event, payload) out to every matching local subscription.
  if (globalRegistered) return
  const anyBridge = bridge() as unknown as {
    addEventListener?: (handler: (event: string, payload: unknown) => void) => () => void
  }
  if (!anyBridge.addEventListener) return
  anyBridge.addEventListener((name, payload) => {
    console.log(`[compat] event received: "${name}"`, payload)
    for (const entry of listeners) {
      if (entry.event === name) {
        try {
          ;(entry.wrapped as Handler<unknown>)({
            event: name,
            id: 0,
            payload,
          })
        } catch (error) {
          console.error(`[compat] listener for "${name}" threw`, error)
        }
      }
    }
  })
  globalRegistered = true
  console.log("[compat] global listener registered")
}

/**
 * Mirrors @tauri-apps/api/event#listen — subscribes to events delivered to
 * this window by the main process (backend broadcasts and targeted emits).
 */
export async function listen<T>(event: string, handler: Handler<T>): Promise<UnlistenFn> {
  ensureGlobalListener()
  const id = nextId++
  const wrapped = handler as Handler<unknown>
  const entry: Entry = { id, event, wrapped }
  listeners.add(entry)
  console.log(`[compat] listen registered for "${event}" (id: ${id})`)

  return () => {
    listeners.delete(entry)
    console.log(`[compat] listen unregistered for "${event}" (id: ${id})`)
  }
}

/**
 * Broadcast an event to all windows (main + every broadcast output).
 * The main process fans it out; the emitting window receives it too.
 */
export async function emit(event: string, payload?: unknown): Promise<void> {
  bridge().emit(event, payload)
}

/** Deliver an event to one specific window by label (e.g. "broadcast-main"). */
export async function emitTo(
  target: string,
  event: string,
  payload?: unknown
): Promise<void> {
  await bridge().emitTo(target, event, payload)
}
