import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { projectRoot } from "./paths"
import { loadEnvFile } from "./env"

export const APP_VERSION = app.getVersion()

let logDir = ""
let logFile = ""

/**
 * File logger with the same `[YYYY-MM-DD][HH:MM:SS.mmm] LEVEL message` line
 * format the Rust backend used, so `export_diagnostics` parsing and any
 * user habits carry over unchanged. Rotates at 5 MB into aleph_<n>.log.
 */
export function initLogger(): string {
  logDir =
    process.env.ALEPH_LOG_DIR ??
    path.join(app.getPath("userData"), "logs")
  fs.mkdirSync(logDir, { recursive: true })
  logFile = path.join(logDir, "aleph.log")
  rotateIfNeeded()
  loadEnvFile(projectRoot())
  info(`Aleph ${APP_VERSION} starting (${process.platform})`)
  return logDir
}

export function getLogDir(): string {
  if (!logDir) initLogger()
  return logDir
}

export function getLogFile(): string {
  if (!logFile) initLogger()
  return logFile
}

const MAX_LOG_BYTES = 5 * 1024 * 1024

function rotateIfNeeded(): void {
  try {
    const stat = fs.statSync(logFile)
    if (stat.size < MAX_LOG_BYTES) return
    // Shift existing archives aleph_2.log -> aleph_3.log, etc.
    for (let n = 4; n >= 1; n--) {
      const from = path.join(logDir, `aleph_${n}.log`)
      const to = path.join(logDir, `aleph_${n + 1}.log`)
      if (fs.existsSync(from)) fs.renameSync(from, to)
    }
    fs.renameSync(logFile, path.join(logDir, "aleph_1.log"))
  } catch {
    // Missing file or locked target — keep writing to the current file.
  }
}

function fmt(): string {
  const d = new Date()
  const pad = (v: number, len = 2): string => String(v).padStart(len, "0")
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
    d.getMilliseconds(),
    3
  )}`
  return `[${date}][${time}]`
}

function writeLine(level: string, message: string): void {
  const line = `${fmt()} [${level.toUpperCase()}] ${message}\n`
  try {
    fs.appendFileSync(logFile, line)
  } catch {
    // Disk full / file locked — logging must never crash the app.
  }
}

function stringify(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a
      if (a instanceof Error) return `${a.name}: ${a.message}`
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(" ")
}

export function info(...args: unknown[]): void {
  writeLine("info", stringify(args))
}
export function warn(...args: unknown[]): void {
  writeLine("warn", stringify(args))
}
export function error(...args: unknown[]): void {
  writeLine("error", stringify(args))
}
export function debug(...args: unknown[]): void {
  if (process.env.ALEPH_DEBUG) writeLine("debug", stringify(args))
}

/** Latency marker lines, matching the Rust `[LAT]` format. */
export function latencyMark(label: string, epochMs: number): void {
  writeLine("info", `[LAT] ${label} ui_epoch_ms=${epochMs}`)
}
