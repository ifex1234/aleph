import { app } from "electron"
import path from "node:path"
import fs from "node:fs"

/**
 * Path resolution mirroring the Tauri layout:
 * - dev checkout root (repo) holds data/, models/, embeddings/, sdk/
 * - packaged apps get aleph.db + NDI runtime in the resources dir
 */
let repoRoot: string | null = null

export function projectRoot(): string {
  if (repoRoot) return repoRoot
  // __dirname is dist-electron in both dev and prod; the repo root is above.
  const dir = path.resolve(app.getAppPath())
  repoRoot = dir
  return dir
}

export function resourceDir(): string {
  return process.resourcesPath ?? projectRoot()
}

function firstExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) return candidate
    } catch {
      // Unreadable path — keep looking.
    }
  }
  return null
}

/** The bible SQLite database, bundled or from the dev checkout. */
export function bibleDbPath(): string {
  return (
    firstExisting([
      path.join(resourceDir(), "aleph.db"),
      path.join(projectRoot(), "data", "aleph.db"),
    ]) ?? path.join(projectRoot(), "data", "aleph.db")
  )
}

/** The hymnal SQLite database, bundled or from the dev checkout. */
export function hymnsDbPath(): string {
  return (
    firstExisting([
      path.join(resourceDir(), "hymns.db"),
      path.join(projectRoot(), "data", "hymns.db"),
    ]) ?? path.join(projectRoot(), "data", "hymns.db")
  )
}

const NDI_LIB_NAMES: Partial<Record<NodeJS.Platform, string>> = {
  win32: "Processing.NDI.Lib.x64.dll",
  darwin: "libndi.dylib",
  linux: "libndi.so",
}

/** The NDI runtime library shipped next to the app. */
export function ndiLibraryPath(): string {
  const name = NDI_LIB_NAMES[process.platform] ?? ""
  return (
    firstExisting([
      path.join(resourceDir(), "ndi", name),
      path.join(projectRoot(), "sdk", "ndi", process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux", name),
    ]) ?? ""
  )
}

export const MODEL_DIR = () => path.join(projectRoot(), "models")
export const EMBEDDINGS_DIR = () => path.join(projectRoot(), "embeddings")

/**
 * Roots searched for optional heavy assets (ONNX embedding model, verse
 * index): the packaged resources dir, the per-user download dir, then the
 * dev checkout. Order matters — bundled assets win over downloaded ones.
 */
export function assetRoots(): string[] {
  return [
    resourceDir(),
    userDataDir(),
    projectRoot(),
  ]
}

/** Candidate directories for a named model under each asset root. */
export function modelDirCandidates(name: string): string[] {
  return assetRoots().map((root) => path.join(root, "models", name))
}

/** Candidate paths for a named embeddings file under each asset root. */
export function embeddingFileCandidates(name: string): string[] {
  return assetRoots().map((root) => path.join(root, "embeddings", name))
}

export function userDataDir(): string {
  return app.getPath("userData")
}
