/**
 * Downloads Bible source data: a pre-built zip of all 10 translations from
 * Google Drive, plus the cross-references dataset from openbible.info.
 *
 * Run: bun run data/download-sources.ts
 */

import { mkdir, rm, open, writeFile } from "node:fs/promises"
import { existsSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"

const DATA_DIR = dirname(fileURLToPath(import.meta.url))
const SOURCES_DIR = join(DATA_DIR, "sources")
const CROSS_REFS_DIR = join(DATA_DIR, "cross-refs")

// Pre-built zip of all 10 translations (~74 MB uncompressed). The `confirm=t`
// query param bypasses Google Drive's "can't scan for viruses" interstitial
// that would otherwise return an HTML page for files >100 MB.
const SOURCES_ZIP_URL =
  "https://drive.google.com/uc?export=download&id=1HQiNf_nCVRQrMbdmzVG7vq-Fvfqh1nzW&confirm=t"

const EXPECTED_TRANSLATIONS = [
  "KJV.json",
  "NIV.json",
  "ESV.json",
  "NASB.json",
  "NKJV.json",
  "NLT.json",
  "AMP.json",
  "SpaRV.json",
  "FreJND.json",
  "PorBLivre.json",
]

const CROSS_REFS_URL = "https://a.openbible.info/data/cross-references.zip"

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`  Downloading ${url}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buffer)
  const sizeMB = (buffer.byteLength / 1024 / 1024).toFixed(1)
  console.log(`  ✓ Saved ${dest} (${sizeMB} MB)`)
}

function isZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 && // P
    bytes[1] === 0x4b && // K
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  )
}

/** Reads the first `bytes` bytes of a file without loading it fully. */
async function readHead(path: string, bytes: number): Promise<Uint8Array> {
  const handle = await open(path, "r")
  try {
    const buf = Buffer.alloc(bytes)
    await handle.read(buf, 0, bytes, 0)
    return buf
  } finally {
    await handle.close()
  }
}

function unzip(
  zipPath: string,
  destDir: string,
  exclude: string[] = []
): Promise<void> {
  // Windows ships bsdtar as tar.exe, which extracts zips fine; macOS/Linux
  // have unzip. Both support exclusions.
  const args =
    process.platform === "win32"
      ? [
          "tar",
          "-xf",
          zipPath,
          "-C",
          destDir,
          ...exclude.flatMap((e) => ["--exclude", e]),
        ]
      : ["unzip", "-o", zipPath, "-d", destDir, ...flatMapExclude(exclude)]
  return new Promise((resolve, reject) => {
    const proc = spawn(args[0]!, args.slice(1), { stdio: "inherit" })
    proc.on("error", reject)
    proc.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`unzip failed (exit ${code}) for ${zipPath}`))
    })
  })
}

function flatMapExclude(exclude: string[]): string[] {
  const args: string[] = []
  for (const e of exclude) args.push("-x", e)
  return args
}

async function downloadSourcesZip(): Promise<void> {
  const allPresent = EXPECTED_TRANSLATIONS.every((f) =>
    existsSync(join(SOURCES_DIR, f))
  )
  if (allPresent) {
    console.log("  ⏭ All translations already present, skipping zip download")
    return
  }

  // Stage the zip in DATA_DIR so it extracts as `data/sources/...` (the zip's
  // internal layout has a top-level `sources/` directory).
  const zipDest = join(DATA_DIR, "sources.zip")
  await downloadFile(SOURCES_ZIP_URL, zipDest)

  // Validate that we got a real zip and not Google Drive's HTML interstitial
  // (happens if the file ID is wrong, the file is private, or quota exceeded).
  if (!isZip(await readHead(zipDest, 4))) {
    await rm(zipDest, { force: true })
    throw new Error(
      "Google Drive returned a non-zip response (likely an HTML page). " +
        "Verify the file's sharing is set to 'Anyone with the link' and that " +
        "the daily download quota has not been exceeded."
    )
  }

  console.log("  📦 Extracting sources.zip...")
  // Exclude macOS resource-fork files (`__MACOSX/`, `._*`) that appear when the
  // zip was created on macOS Finder.
  await unzip(zipDest, DATA_DIR, ["__MACOSX/*", "*/.*"])
  await rm(zipDest, { force: true })
  await rm(join(DATA_DIR, "__MACOSX"), { recursive: true, force: true })

  const missing = EXPECTED_TRANSLATIONS.filter(
    (f) => !existsSync(join(SOURCES_DIR, f))
  )
  if (missing.length > 0) {
    throw new Error(
      `Zip extracted but missing expected files: ${missing.join(", ")}`
    )
  }
  console.log(`  ✓ Extracted ${EXPECTED_TRANSLATIONS.length} translations`)
}

async function downloadCrossRefs(): Promise<void> {
  const crossRefFile = join(CROSS_REFS_DIR, "cross_references.txt")
  if (existsSync(crossRefFile) && statSync(crossRefFile).size > 1000) {
    console.log("  ⏭ cross_references.txt already exists, skipping")
    return
  }

  const zipDest = join(CROSS_REFS_DIR, "cross-references.zip")
  await downloadFile(CROSS_REFS_URL, zipDest)
  await unzip(zipDest, CROSS_REFS_DIR)
  await rm(zipDest, { force: true })
}

async function main() {
  await mkdir(SOURCES_DIR, { recursive: true })
  await mkdir(CROSS_REFS_DIR, { recursive: true })

  console.log("\n📖 Downloading Bible translations (pre-built zip)...\n")
  await downloadSourcesZip()

  console.log("\n🔗 Downloading cross-references...\n")
  await downloadCrossRefs()

  console.log("\n✅ All source data downloaded!\n")
}

main().catch((err) => {
  console.error("❌ Download failed:", err)
  process.exit(1)
})
