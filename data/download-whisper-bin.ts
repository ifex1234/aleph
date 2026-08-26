/**
 * Downloads prebuilt whisper.cpp CLI binaries for local speech-to-text.
 *
 * Windows x64: official ggml-org/whisper.cpp release asset (CPU build,
 * ~8 MB) extracted into sdk/whisper/win32/.
 * macOS/Linux: no reliable universal prebuilt — prints install guidance
 * (brew or cmake); the app also honors ALEPH_WHISPER_BIN.
 *
 * Run: bun run download:whisper-bin
 */

import { createWriteStream } from "node:fs"
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs"
import { cpSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SDK_DIR = join(PROJECT_ROOT, "sdk", "whisper")
const WIN_ZIP_URL =
  "https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-x64.zip"
const BIN_NAME = process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli"

async function downloadTo(url: string, dest: string): Promise<void> {
  console.log(`  Downloading ${url}...`)
  const response = await fetch(url, { redirect: "follow" })
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`)
  }

  const totalBytes = Number(response.headers.get("content-length") ?? 0)
  const totalMB = (totalBytes / 1_000_000).toFixed(1)
  const writer = createWriteStream(dest)
  const reader = response.body.getReader()

  let downloaded = 0
  let lastPercent = -1
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    writer.write(Buffer.from(value))
    downloaded += value.byteLength
    if (totalBytes > 0) {
      const percent = Math.floor((downloaded / totalBytes) * 100)
      if (percent !== lastPercent && percent % 10 === 0) {
        process.stdout.write(
          `\r  ${percent}% (${(downloaded / 1_000_000).toFixed(1)}/${totalMB} MB)`
        )
        lastPercent = percent
      }
    }
  }
  process.stdout.write("\n")

  writer.end()
  await new Promise<void>((resolve, reject) => {
    writer.on("finish", resolve)
    writer.on("error", reject)
  })
}

/** Finds a file recursively (depth-unbounded, small trees only). */
function findFile(dir: string, name: string): string | null {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const hit = findFile(full, name)
      if (hit) return hit
    } else if (entry.name.toLowerCase() === name.toLowerCase()) {
      return full
    }
  }
  return null
}

async function installWindows(): Promise<void> {
  const destDir = join(SDK_DIR, "win32")
  if (existsSync(join(destDir, BIN_NAME))) {
    console.log(`  ✓ whisper-cli already installed at ${destDir}`)
    return
  }

  mkdirSync(destDir, { recursive: true })
  const stamp = Date.now()
  const zipPath = join(tmpdir(), `whisper-bin-${stamp}.zip`)
  const extractDir = join(tmpdir(), `whisper-bin-${stamp}`)

  try {
    await downloadTo(WIN_ZIP_URL, zipPath)

    console.log(`  Extracting to ${destDir}...`)
    mkdirSync(extractDir, { recursive: true })
    // Windows ships bsdtar as tar.exe, which extracts zips fine.
    const proc = spawnSync("tar", ["-xf", zipPath, "-C", extractDir], {
      stdio: "inherit",
    })
    if (proc.status !== 0) {
      throw new Error(`Extraction failed (exit ${proc.status})`)
    }

    const exe = findFile(extractDir, BIN_NAME)
    if (!exe) throw new Error(`whisper-cli.exe not found in the archive`)

    // Copy the binary's whole folder so sibling runtime DLLs come along.
    cpSync(dirname(exe), destDir, { recursive: true })
    console.log(`  ✓ Installed ${join(destDir, BIN_NAME)}`)
  } finally {
    rmSync(zipPath, { force: true })
    rmSync(extractDir, { recursive: true, force: true })
  }
}

function printUnixGuidance(): void {
  const platformDir =
    process.platform === "darwin" ? "macos" : "linux"
  const target = join(SDK_DIR, platformDir)
  console.log(
    `
No universal prebuilt whisper.cpp binary exists for ${process.platform}.
Install it one of these ways:

  macOS:
    brew install whisper-cpp
    Then either copy it into place:
      mkdir -p "${target}" && cp $(brew --prefix)/bin/whisper-cli "${target}/"
    ...or point the app at it:
      export ALEPH_WHISPER_BIN=$(brew --prefix)/bin/whisper-cli

  Linux (build from source):
    git clone https://github.com/ggml-org/whisper.cpp
    cd whisper.cpp && cmake -B build && cmake --build build -j --target whisper-cli
    mkdir -p "${target}" && cp build/bin/whisper-cli "${target}/"

The app looks for whisper-cli in (first match wins):
  $ALEPH_WHISPER_BIN
  <repo>/sdk/whisper/${platformDir}/whisper-cli
  /opt/homebrew/bin/whisper-cli, /usr/local/bin/whisper-cli
`.trim()
  )
}

async function main() {
  console.log("\n=== Downloading whisper.cpp CLI ===\n")
  if (process.platform === "win32" && process.arch === "x64") {
    await installWindows()
  } else {
    printUnixGuidance()
    process.exitCode = 1
  }
  console.log("\n=== Done ===")
}

main().catch((e) => {
  console.error("Failed to download whisper binaries:", e)
  process.exit(1)
})
