/**
 * Builds the whisper.cpp CLI from source for the current platform and stages
 * it under sdk/whisper/<macos|linux>/, mirroring the committed Windows
 * binaries in sdk/whisper/win32/. electron-builder then embeds it via the
 * platform extraResources entry, so the packaged app resolves it through
 * resourceDir()/whisper with zero user setup.
 *
 * Why build instead of download? Unlike Windows x64 (one official
 * ggml-org prebuilt), macOS/Linux have no single universal binary:
 * Apple Silicon vs Intel, varying glibc, CPU vs CUDA. Compiling on the
 * release runner itself guarantees the binary matches the shipped OS.
 *
 * Windows is a deliberate no-op: `download:whisper-bin` already provides
 * the prebuilt there.
 *
 * Run: bun run electron/scripts/build-whisper-cli.mjs
 * Env: WHISPER_VERSION (default v1.9.2, kept in sync with the Windows
 *      prebuilt in data/download-whisper-bin.ts).
 */

import { existsSync, mkdirSync, cpSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const VERSION = process.env.WHISPER_VERSION ?? "v1.9.2"
const REPO = "https://github.com/ggml-org/whisper.cpp"
const BIN_NAME =
  process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli"

function sh(cmd, args, opts = {}) {
  const proc = spawnSync(cmd, args, { stdio: "inherit", ...opts })
  if (proc.status !== 0) {
    throw new Error(`'${cmd} ${args.join(" ")}' failed (exit ${proc.status})`)
  }
}

async function main() {
  if (process.platform === "win32") {
    console.log("Windows uses the prebuilt via download:whisper-bin — nothing to do.")
    return
  }
  if (process.platform !== "darwin" && process.platform !== "linux") {
    throw new Error(`Unsupported platform: ${process.platform}`)
  }

  const platformDir = process.platform === "darwin" ? "macos" : "linux"
  const destDir = join(PROJECT_ROOT, "sdk", "whisper", platformDir)
  if (existsSync(join(destDir, BIN_NAME))) {
    console.log(`✓ whisper-cli already staged at ${destDir}`)
    return
  }

  const stamp = Date.now()
  const srcDir = join(tmpdir(), `whisper-src-${stamp}`)
  const buildDir = join(tmpdir(), `whisper-build-${stamp}`)
  try {
    console.log(`Cloning whisper.cpp ${VERSION}...`)
    sh("git", ["clone", "--depth", "1", "--branch", VERSION, REPO, srcDir])
    console.log("Compiling whisper-cli (Release, CPU)...")
    sh("cmake", ["-S", srcDir, "-B", buildDir, "-DCMAKE_BUILD_TYPE=Release"])
    sh("cmake", ["--build", buildDir, "-j", "--target", "whisper-cli"])

    const built = join(buildDir, "bin", BIN_NAME)
    if (!existsSync(built)) {
      throw new Error(`Expected binary missing: ${built}`)
    }
    // Copy the binary's whole folder so sibling runtime libs (.dylib/.so)
    // travel with it, exactly like the committed Windows folder.
    mkdirSync(destDir, { recursive: true })
    cpSync(join(buildDir, "bin"), destDir, { recursive: true })
    console.log(`✓ Staged ${join(destDir, BIN_NAME)}`)
  } finally {
    rmSync(srcDir, { recursive: true, force: true })
    rmSync(buildDir, { recursive: true, force: true })
  }
}

main().catch((e) => {
  console.error("Failed to build whisper.cpp CLI:", e)
  process.exit(1)
})
