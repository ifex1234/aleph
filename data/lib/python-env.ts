/**
 * Shared Python environment management utilities.
 *
 * Provides functions to find Python, create/manage a .venv, and install pip
 * packages. Used by download-model.ts and prepare-embeddings.ts so every
 * Python-dependent script shares a single virtual-environment setup path.
 */

import { spawn } from "node:child_process"
import { join, dirname } from "node:path"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { run } from "./exec"

export const PROJECT_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
)
export const VENV_DIR = join(PROJECT_ROOT, ".venv")
export const MIN_PYTHON_VERSION: [number, number, number] = [3, 9, 0]

export function getVenvBin(name: string): string {
  if (process.platform === "win32") {
    return join(VENV_DIR, "Scripts", `${name}.exe`)
  }
  return join(VENV_DIR, "bin", name)
}

/** Runs `cmd --version`, resolving with stdout on success or null if the binary is unavailable. */
function probeVersion(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
    })
    let out = ""
    proc.stdout?.on("data", (chunk) => {
      out += chunk
    })
    proc.on("error", () => resolve(null))
    proc.on("close", (code) => {
      resolve(code === 0 && out.includes("Python") ? out : null)
    })
  })
}

export async function findPython(): Promise<string> {
  for (const candidate of [
    "python3.12",
    "python3.11",
    "python3.10",
    "python3",
    "python",
  ]) {
    const output = await probeVersion(candidate)
    if (output !== null) return candidate
  }

  console.error("\n❌ Python not found.")
  console.error(
    "   Please install Python >= 3.9.0 and ensure it is in your PATH."
  )
  process.exit(1)
}

export function parsePythonVersion(
  output: string
): [number, number, number] {
  const match = output.trim().match(/Python\s+(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    throw new Error(`Could not parse Python version from: ${output.trim()}`)
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function isVersionSufficient(
  version: [number, number, number]
): boolean {
  for (let i = 0; i < 3; i++) {
    if (version[i] > MIN_PYTHON_VERSION[i]) return true
    if (version[i] < MIN_PYTHON_VERSION[i]) return false
  }
  return true
}

export async function ensureVenv(pythonCmd: string): Promise<void> {
  const venvPython =
    process.platform === "win32"
      ? getVenvBin("python")
      : getVenvBin("python3")

  if (existsSync(venvPython)) {
    console.log(`  ⏭ Virtual environment already exists at ${VENV_DIR}`)
    return
  }

  console.log(`  Creating virtual environment at ${VENV_DIR}...`)
  try {
    await run([pythonCmd, "-m", "venv", VENV_DIR])
  } catch {
    console.error("\n❌ Failed to create virtual environment.")
    process.exit(1)
  }
  console.log("  ✓ Virtual environment created")
}

export async function installPipDeps(packages: string[]): Promise<void> {
  const pip = getVenvBin("pip")
  console.log(`  Installing ${packages.join(", ")}...`)
  try {
    await run([pip, "install", ...packages])
  } catch {
    console.error("\n❌ Failed to install dependencies.")
    process.exit(1)
  }
  console.log("  ✓ Dependencies installed")
}

/**
 * Full Python environment setup: find Python, verify version, create venv,
 * install packages. Returns the path to the venv Python binary.
 */
export async function ensurePythonEnv(
  packages: string[]
): Promise<string> {
  console.log("\n🐍 Setting up Python environment...\n")

  const pythonCmd = await findPython()

  const versionOutput = await probeVersion(pythonCmd)
  if (versionOutput === null) {
    console.error(`\n❌ Could not read ${pythonCmd} version.`)
    process.exit(1)
  }
  const version = parsePythonVersion(versionOutput)
  console.log(`  Found ${pythonCmd} version ${version.join(".")}`)

  if (!isVersionSufficient(version)) {
    console.error(
      `\n❌ Python >= ${MIN_PYTHON_VERSION.join(".")} is required, found ${version.join(".")}`
    )
    process.exit(1)
  }

  await ensureVenv(pythonCmd)
  await installPipDeps(packages)

  return getVenvBin(process.platform === "win32" ? "python" : "python3")
}
