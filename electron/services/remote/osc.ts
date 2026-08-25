import dgram from "node:dgram"
import { coerceBool, coerceFloat, dispatch } from "./dispatcher"
import { info, warn } from "../logger"

/**
 * Minimal OSC UDP listener — the rosc equivalent. Parses the subset of OSC
 * 1.0 the Rust backend accepted: address patterns /aleph/<command> with
 * string/int/float/bool arguments.
 */

const DEFAULT_PORT = 8000

interface OscMessage {
  address: string
  args: Array<string | number | boolean>
}

function parseOscPacket(buf: Buffer): OscMessage[] {
  const messages: OscMessage[] = []
  let offset = 0

  const readPaddedString = (): string => {
    let end = offset
    while (end < buf.length && buf[end] !== 0) end++
    const s = buf.subarray(offset, end).toString("utf8")
    offset = end + 1
    // Align to 4 bytes.
    while (offset % 4 !== 0 && offset < buf.length) offset++
    return s
  }

  try {
    const address = readPaddedString()
    if (!address.startsWith("/")) return messages
    if (offset >= buf.length || buf[offset] !== 0x2c) {
      messages.push({ address, args: [] })
      return messages
    }
    offset++ // ','
    let typesEnd = offset
    while (typesEnd < buf.length && buf[typesEnd] !== 0) typesEnd++
    const types = buf.subarray(offset, typesEnd).toString("ascii")
    offset = typesEnd + 1
    while (offset % 4 !== 0 && offset < buf.length) offset++

    const args: Array<string | number | boolean> = []
    for (const t of types) {
      switch (t) {
        case "i": {
          args.push(buf.readInt32BE(offset))
          offset += 4
          break
        }
        case "f": {
          args.push(buf.readFloatBE(offset))
          offset += 4
          break
        }
        case "s": {
          args.push(readPaddedString())
          break
        }
        case "T":
          args.push(true)
          break
        case "F":
          args.push(false)
          break
        default:
          // Unknown type — stop parsing this message.
          return messages.length > 0 ? messages : [{ address, args }]
      }
    }
    messages.push({ address, args })
    return messages
  } catch (e) {
    warn("[osc] malformed packet:", e)
    return messages
  }
}

export class OscServer {
  private socket: dgram.Socket | null = null
  private port = DEFAULT_PORT

  isRunning(): boolean {
    return this.socket !== null
  }
  boundPort(): number {
    return this.port
  }

  async start(port?: number): Promise<number> {
    await this.stopInternal()
    const socket = dgram.createSocket("udp4")

    socket.on("message", (buf) => {
      for (const msg of parseOscPacket(buf)) {
        this.handle(msg)
      }
    })
    socket.on("error", (e) => {
      warn("[osc] socket error:", e)
    })

    const requested = port ?? DEFAULT_PORT
    await new Promise<void>((resolve, reject) => {
      const onError = (e: Error): void => {
        cleanup()
        reject(e)
      }
      const onListening = (): void => {
        cleanup()
        resolve()
      }
      const cleanup = (): void => {
        socket.removeListener("error", onError)
        socket.removeListener("listening", onListening)
      }
      socket.once("error", onError)
      socket.once("listening", onListening)
      socket.bind(requested)
    })

    this.socket = socket
    this.port = (socket.address() as { port: number }).port
    info(`[osc] listening on 0.0.0.0:${this.port}`)
    return this.port
  }

  /** Map an /aleph/<command> message to a dispatcher call. */
  private handle(msg: OscMessage): void {
    const match = /^\/aleph\/([a-z_]+)$/i.exec(msg.address)
    if (!match) return
    const name = match[1].toLowerCase()
    const arg = msg.args[0]

    switch (name) {
      case "next":
        dispatch({ command: "next" })
        break
      case "prev":
        dispatch({ command: "prev" })
        break
      case "show":
        dispatch({ command: "show" })
        break
      case "hide":
        dispatch({ command: "hide" })
        break
      case "send_to_live":
        dispatch({ command: "send_to_live" })
        break
      case "bible_next":
        dispatch({ command: "bible_next" })
        break
      case "bible_prev":
        dispatch({ command: "bible_prev" })
        break
      case "add_to_queue":
        dispatch({ command: "add_to_queue" })
        break
      case "theme": {
        const value = typeof arg === "string" ? arg : null
        if (!value) return
        dispatch({ command: "theme", value })
        break
      }
      case "opacity": {
        const v = coerceFloat(arg)
        if (v === null) return
        dispatch({ command: "opacity", value: v })
        break
      }
      case "confidence": {
        const v = coerceFloat(arg)
        if (v === null) return
        dispatch({ command: "confidence", value: v })
        break
      }
      case "on_air": {
        const v = coerceBool(arg)
        if (v === null) return
        dispatch({ command: "on_air", value: v })
        break
      }
      default:
        return
    }
  }

  async stop(): Promise<void> {
    await this.stopInternal()
    info("[osc] stopped")
  }

  private stopInternal(): Promise<void> {
    const socket = this.socket
    this.socket = null
    if (!socket) return Promise.resolve()
    return new Promise((resolve) => {
      try {
        socket.close(() => resolve())
      } catch {
        resolve()
      }
    })
  }
}
