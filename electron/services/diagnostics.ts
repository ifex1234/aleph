import fs from "node:fs"
import path from "node:path"
import { getLogFile } from "./logger"
import { APP_VERSION } from "./logger"

/**
 * Diagnostics export — reads the log file (and rotated archives), filters by
 * age, and prefixes a header. Same output shape as the Rust command.
 */

interface LogLine {
  date: string
  time: string
  text: string
}

function parseTimestamp(text: string): LogLine | null {
  const match = /^\[(\d{4})-(\d{2})-(\d{2})\]\[(\d{2}):(\d{2}):(\d{2})\.(\d{3})\]\s?(.*)$/.exec(
    text
  )
  if (!match) return null
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}:${match[6]}.${match[7]}`,
    text: match[8],
  }
}

function readLogFiles(): LogLine[] {
  const file = getLogFile()
  const dir = path.dirname(file)
  const base = path.basename(file)
  const files = [base]
  for (let n = 1; n <= 5; n++) {
    const rotated = path.join(dir, base.replace(/\.log$/, `_${n}.log`))
    if (fs.existsSync(rotated)) files.push(path.basename(rotated))
  }

  const lines: LogLine[] = []
  for (const name of files) {
    try {
      const content = fs.readFileSync(path.join(dir, name), "utf8")
      for (const raw of content.split(/\r?\n/)) {
        const parsed = parseTimestamp(raw)
        lines.push(parsed ?? { date: "", time: "", text: raw })
      }
    } catch {
      // Missing or unreadable archive — skip.
    }
  }
  return lines.reverse() // newest first, like the Rust exporter
}

export function exportDiagnostics(sinceMinutes?: number | null): string {
  const now = new Date()
  const cutoff = new Date(now.getTime() - (sinceMinutes ?? 0) * 60_000)

  let included = 0
  const body: string[] = []

  for (const line of readLogFiles()) {
    if (!line.date) continue // non-log noise line
    if (sinceMinutes !== null && sinceMinutes !== undefined) {
      const [y, m, d] = line.date.split("-").map(Number)
      const [hh, mm, ss] = line.time.split(":").map(Number)
      const lineDate = new Date(y, m - 1, d, hh, mm, ss)
      if (lineDate < cutoff) continue
    }
    included++
    body.push(`[${line.date}][${line.time}] ${line.text}`)
  }

  const header = [
    `# Aleph ${APP_VERSION} diagnostics`,
    `# platform=${process.platform} arch=${process.arch}`,
    `# window=broadcast+main`,
    `# exported_at=${now.toISOString()}`,
    `# lines=${included}${sinceMinutes ? ` (last ${sinceMinutes} minutes)` : " (all)"}`,
    `# NOTE: logs may contain short fragments of speech picked up by transcription.`,
    ``,
  ].join("\n")

  return header + [...body].reverse().join("\n") + "\n"
}
