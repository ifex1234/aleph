#!/usr/bin/env node
/**
 * Publishes the semantic-search assets to a GitHub release so packaged
 * builds can download them on first launch (see
 * electron/services/semantic-download.ts for the consumer side).
 *
 * What it does:
 *   1. Locates the generated assets in the repo checkout
 *      (models/, embeddings/) — or kicks off generation with --generate.
 *   2. Streams SHA-256 checksums and writes <asset>.sha256 sidecars into
 *      dist-assets/ (tiny text files, safe even on a nearly-full disk).
 *   3. Uploads every asset + sidecar to the latest GitHub release,
 *      replacing same-named assets if they already exist.
 *   4. Verifies each asset resolves via releases/latest/download/<name>
 *      with the expected byte size.
 *
 * Nothing multiplies your disk usage: sources are hashed and uploaded
 * in place, never copied.
 *
 * Usage:
 *   node scripts/publish-semantic-assets.mjs [--generate] [--tag v0.3.2]
 *        [--repo owner/name] [--dry-run]
 *
 * Requires GH_TOKEN (or GITHUB_TOKEN) with repo contents access.
 * Run: bun run publish:semantic
 */

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..")
const STAGE_DIR = path.join(PROJECT_ROOT, "dist-assets")
const DEFAULT_REPO = "openbezal/aleph"

// Must stay in sync with electron/services/semantic-download.ts.
const ASSETS = [
  {
    name: "Aleph-qwen3-embedding-0.6b-int8.onnx",
    src: path.join(PROJECT_ROOT, "models", "qwen3-embedding-0.6b-int8", "model_quantized.onnx"),
  },
  {
    name: "Aleph-kjv-qwen3-0.6b.bin",
    src: path.join(PROJECT_ROOT, "embeddings", "kjv-qwen3-0.6b.bin"),
  },
  {
    name: "Aleph-kjv-qwen3-0.6b-ids.bin",
    src: path.join(PROJECT_ROOT, "embeddings", "kjv-qwen3-0.6b-ids.bin"),
  },
]

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

const DRY_RUN = flag("--dry-run")
const GENERATE = flag("--generate")
const TAG = opt("--tag") // default: whichever release is marked Latest
const REPO = opt("--repo") ?? process.env.ALEPH_RELEASE_REPO ?? DEFAULT_REPO
const TOKEN = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN

const API = `https://api.github.com/repos/${REPO}`

function die(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function human(bytes) {
  const units = ["B", "KB", "MB", "GB"]
  let n = bytes
  let u = 0
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024
    u++
  }
  return `${n.toFixed(n >= 100 || u === 0 ? 0 : 1)} ${units[u]}`
}

async function api(pathname, init = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    die(`GitHub API ${init.method ?? "GET"} ${pathname} failed: HTTP ${res.status}\n${body}`)
  }
  return res.status === 204 ? null : res.json()
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256")
    fs.createReadStream(file)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex").toLowerCase()))
      .on("error", reject)
  })
}

async function uploadAsset(release, filePath, assetName) {
  const url = `${release.upload_url.split("{")[0]}?name=${encodeURIComponent(assetName)}`
  // Replace semantics: drop an existing same-named asset first.
  const existing = release.assets?.find((a) => a.name === assetName)
  if (existing) {
    console.log(`   ↻ replacing existing ${assetName}`)
    if (!DRY_RUN) await api(`/releases/assets/${existing.id}`, { method: "DELETE" })
  }
  const size = fs.statSync(filePath).size
  if (DRY_RUN) {
    console.log(`   ↑ would upload ${assetName} (${human(size)})`)
    return
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/octet-stream",
      "Content-Length": size,
    },
    body: fs.createReadStream(filePath),
    duplex: "half",
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    die(`Upload of ${assetName} failed: HTTP ${res.status}\n${body}`)
  }
}

async function main() {
  if (!TOKEN) die("GH_TOKEN (or GITHUB_TOKEN) env var is required.")
  console.log(`\n📦 Publishing semantic-search assets (${REPO}${TAG ? `, tag ${TAG}` : ", latest release"})${DRY_RUN ? " — DRY RUN" : ""}\n`)

  const missing = ASSETS.filter((a) => !fs.existsSync(a.src))
  if (missing.length > 0) {
    if (!GENERATE) {
      console.error("   Missing assets:")
      for (const a of missing) console.error(`     - ${path.relative(PROJECT_ROOT, a.src)}`)
      die(
        "Generate them first with: bun run setup:all --with-embedding\n" +
        "(~10 GB free disk, hours of compute) — or pass --generate to run it now."
      )
    }
    console.log("🧠 Generating assets via setup:all --with-embedding …")
    const result = spawnSync("bun", ["run", "setup:all", "--with-embedding"], {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    })
    if (result.status !== 0) die("Asset generation failed.")
  }

  // ── Hash + sidecars ────────────────────────────────────────────────
  fs.mkdirSync(STAGE_DIR, { recursive: true })
  for (const asset of ASSETS) {
    process.stdout.write(`#️⃣  ${asset.name} (${human(fs.statSync(asset.src).size)}) … `)
    const hex = await sha256(asset.src)
    const sidecarName = `${asset.name}.sha256`
    const sidecarPath = path.join(STAGE_DIR, sidecarName)
    if (!DRY_RUN) fs.writeFileSync(sidecarPath, `${hex}  ${asset.name}`)
    console.log(hex.slice(0, 12) + "…")
    asset.sha256 = hex
    asset.sidecarPath = sidecarPath
    asset.sidecarName = sidecarName
  }

  // ── Resolve target release ─────────────────────────────────────────
  const release = TAG
    ? await api(`/releases/tags/${TAG}`)
    : await api("/releases/latest")
  if (!release?.upload_url) die(TAG ? `No release found for tag ${TAG}.` : "No releases found — create one first.")
  console.log(`\n🏷  Target release: ${release.name || release.tag_name} (${release.tag_name})`)

  // ── Upload ─────────────────────────────────────────────────────────
  console.log("\n🚀 Uploading…")
  for (const asset of ASSETS) {
    await uploadAsset(release, asset.src, asset.name)
    await uploadAsset(release, asset.sidecarPath, asset.sidecarName)
  }

  if (DRY_RUN) {
    console.log("\n✅ Dry run complete — nothing was uploaded.\n")
    return
  }

  // ── Verify public download URLs ────────────────────────────────────
  console.log("\n🔍 Verifying public download URLs…")
  let ok = true
  for (const asset of ASSETS) {
    const expected = fs.statSync(asset.src).size
    const head = await fetch(`https://github.com/${REPO}/releases/latest/download/${encodeURIComponent(asset.name)}`, {
      method: "GET",
      headers: { Range: "bytes=0-0" }, // don't pull hundreds of MB just to validate
      redirect: "follow",
    })
    await head.body?.cancel()
    const total = Number(head.headers.get("content-range")?.split("/")[1] ?? head.headers.get("content-length") ?? -1)
    const pass = head.status === 206 && total === expected
    console.log(`   ${pass ? "✓" : "✗"} ${asset.name} (${human(total)})`)
    ok = ok && pass
  }

  console.log(
    ok
      ? "\n✅ All assets published and verified. Packaged builds will now offer semantic search on first launch.\n"
      : "\n⚠️  Uploaded, but verification failed — check the release page before tagging a build.\n"
  )
  process.exitCode = ok ? 0 : 1
}

main().catch((e) => die(e instanceof Error ? e.stack ?? e.message : String(e)))
