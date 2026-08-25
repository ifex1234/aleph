import { exec } from "node:child_process"
import { promisify } from "node:util"
import fs from "node:fs"
import path from "node:path"
import { info } from "./logger"

const execAsync = promisify(exec)

/**
 * System font enumeration — the fontdb equivalent. Uses .NET's
 * InstalledFontCollection on Windows, fc-list on Linux, system_profiler
 * fallbacks on macOS. Cached for the process lifetime.
 */

let cache: string[] | null = null

export async function listSystemFonts(): Promise<string[]> {
  if (cache) return cache
  try {
    if (process.platform === "win32") {
      const script = [
        "Add-Type -AssemblyName PresentationCore",
        "$f = New-Object System.Windows.Media.FontFamily('x')",
        "[System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null",
        "$fc = New-Object System.Drawing.Text.InstalledFontCollection",
        "$fc.Families | ForEach-Object { $_.Name }",
      ].join("; ")
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`,
        { maxBuffer: 8 * 1024 * 1024 }
      )
      cache = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
    } else if (process.platform === "darwin") {
      const { stdout } = await execAsync("system_profiler SPFontsDataType 2>/dev/null | grep -E 'Full Name:' | sed 's/.*Full Name: //'")
      cache = [...new Set(stdout.split("\n").map((l) => l.trim()).filter(Boolean))]
    } else {
      const { stdout } = await execAsync("fc-list --format='%{family}\\n' 2>/dev/null")
      const families = new Set<string>()
      for (const line of stdout.split("\n")) {
        for (const f of line.split(",")) {
          const trimmed = f.trim()
          if (trimmed) families.add(trimmed)
        }
      }
      cache = [...families]
    }
  } catch (e) {
    info(`[fonts] enumeration failed: ${String(e)}`)
    cache = []
  }

  cache = [...new Set(cache.map((c) => c.trim()).filter(Boolean))].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  )
  return cache
}

/** Directory scan used as a last-resort fallback. */
export async function listFontDirs(): Promise<string[]> {
  const dirs =
    process.platform === "win32"
      ? [path.join(process.env.WINDIR ?? "C:\\Windows", "Fonts")]
      : process.platform === "darwin"
        ? ["/Library/Fonts", "/System/Library/Fonts"]
        : ["/usr/share/fonts", "/usr/local/share/fonts", `${process.env.HOME}/.fonts`]
  return dirs.filter((d) => {
    try {
      return fs.existsSync(d)
    } catch {
      return false
    }
  })
}
