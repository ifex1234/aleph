import { emitAll } from "../events"
import { info } from "../logger"

/**
 * Protocol-neutral remote command dispatcher — the port of crates/api/src
 * (command.rs, coerce.rs, dispatch.rs). OSC and HTTP both funnel through
 * `dispatch()`, which emits the same `remote:*` events the frontend listens
 * for. Payloads are JSON-encoded strings, matching the Rust behavior that
 * the frontend's parsePayload() expects.
 */

export type RemoteCommand =
  | { command: "next" }
  | { command: "prev" }
  | { command: "show" }
  | { command: "hide" }
  | { command: "theme"; value: string }
  | { command: "opacity"; value: number }
  | { command: "confidence"; value: number }
  | { command: "on_air"; value: boolean }
  | { command: "send_to_live" }
  | { command: "bible_next" }
  | { command: "bible_prev" }
  | { command: "add_to_queue" }

export const REMOTE_COMMAND_NAMES = [
  "next", "prev", "show", "hide", "theme", "opacity", "confidence",
  "on_air", "send_to_live", "bible_next", "bible_prev", "add_to_queue",
] as const

/** Status snapshot served by GET /api/v1/status, pushed by the frontend. */
export interface StatusSnapshot {
  on_air: boolean
  active_theme: string | null
  live_verse: string | null
  queue_length: number
  confidence_threshold: number
}

export const statusSnapshot: StatusSnapshot = {
  on_air: false,
  active_theme: null,
  live_verse: null,
  queue_length: 0,
  confidence_threshold: 0.8,
}

// ---------------------------------------------------------------------------
// Value coercion (port of coerce.rs)
// ---------------------------------------------------------------------------

export function coerceBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value >= 0.5 ? true : value === 0 ? false : null
  if (typeof value === "string") {
    const s = value.trim().toLowerCase()
    if (s === "true" || s === "1" || s === "on") return true
    if (s === "false" || s === "0" || s === "off") return false
  }
  return null
}

/** Floats clamp to [0,1]; integers >1 are treated as percentages. */
export function coerceFloat(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value)) {
    if (Number.isInteger(value) && value > 1) return Math.min(value / 100, 1)
    return Math.max(0, Math.min(1, value))
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value)
    if (isFinite(n)) return coerceFloat(n)
    return null
  }
  return null
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string") return value
  if (typeof value === "number" && isFinite(value)) return String(value)
  return null
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export function dispatch(cmd: RemoteCommand): void {
  switch (cmd.command) {
    case "next":
      emitAll("remote:next", "{}")
      break
    case "prev":
      emitAll("remote:prev", "{}")
      break
    case "show":
      emitAll("remote:show", "{}")
      break
    case "hide":
      emitAll("remote:hide", "{}")
      break
    case "send_to_live":
      emitAll("remote:send_to_live", "{}")
      break
    case "bible_next":
      emitAll("remote:bible_next", "{}")
      break
    case "bible_prev":
      emitAll("remote:bible_prev", "{}")
      break
    case "add_to_queue":
      emitAll("remote:add_to_queue", "{}")
      break
    case "theme": {
      const name = coerceString(cmd.value)
      if (!name) return
      emitAll("remote:theme", JSON.stringify({ name }))
      break
    }
    case "opacity": {
      const v = coerceFloat(cmd.value)
      if (v === null) return
      emitAll("remote:opacity", JSON.stringify({ value: v }))
      break
    }
    case "confidence": {
      const v = coerceFloat(cmd.value)
      if (v === null) return
      emitAll("remote:confidence", JSON.stringify({ value: v }))
      break
    }
    case "on_air": {
      const v = coerceBool(cmd.value)
      if (v === null) return
      emitAll("remote:on_air", JSON.stringify({ active: v }))
      break
    }
  }
  info(`[remote] dispatched ${cmd.command}`)
}

/** Parse an HTTP body `{command, value}` into a RemoteCommand. */
export function parseHttpCommand(body: Record<string, unknown>): RemoteCommand | null {
  const command = body.command
  if (typeof command !== "string") return null
  const hasValue = "value" in body
  switch (command as RemoteCommand["command"]) {
    case "next":
    case "prev":
    case "show":
    case "hide":
    case "send_to_live":
    case "bible_next":
    case "bible_prev":
    case "add_to_queue":
      return { command } as RemoteCommand
    case "theme":
    case "opacity":
    case "confidence":
    case "on_air":
      if (!hasValue) return null
      return { command, value: body.value } as RemoteCommand
    default:
      return null
  }
}
