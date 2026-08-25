import fs from "node:fs"
import path from "node:path"

/**
 * Minimal .env loader standing in for dotenvy. Loads the repo-root .env once
 * at startup; real environment variables always win.
 */
export function loadEnvFile(root: string): void {
  const file = path.join(root, ".env")
  let text: string
  try {
    text = fs.readFileSync(file, "utf8")
  } catch {
    return
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
