/**
 * 3-Phase TS-only sqlite-vec builder — replaces the 7-phase Python pipeline.
 *
 * Phase 1: Bible DB already exists (build-bible-db.ts)
 * Phase 2: Model already downloaded (download-model.ts → direct HF ONNX, no optimum)
 * Phase 3: This script — embeds KJV verses via onnxruntime-node + @huggingface/transformers
 *          and inserts them into a sqlite-vec virtual table inside aleph.db.
 *
 * Run:  node --loader tsx data/build-vec-index.ts  (or: bun run build:vec-index)
 *       Requires models/qwen3-embedding-0.6b-int8/model_quantized.onnx + tokenizer.json
 *       Outputs: data/aleph.db now contains vec_verses virtual table.
 *
 * Design: Uses better-sqlite3 + sqlite-vec (native extension) — bun:sqlite cannot load extensions.
 *         For CI, run with Node: `node --loader tsx data/build-vec-index.ts`
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Database from "better-sqlite3"
import * as vec from "sqlite-vec"

const DATA_DIR = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(DATA_DIR, "aleph.db")
const BATCH_SIZE = 32
const MAX_TOKENS = 128

function findModelDir(): string | null {
  const candidates = [
    path.join(DATA_DIR, "..", "models", "qwen3-embedding-0.6b-int8"),
    path.join(DATA_DIR, "..", "models", "qwen3-embedding-0.6b"),
  ]
  for (const dir of candidates) {
    const file = dir.endsWith("int8") ? "model_quantized.onnx" : "model.onnx"
    if (fs.existsSync(path.join(dir, file)) && fs.existsSync(path.join(dir, "tokenizer.json"))) {
      return dir
    }
  }
  return null
}

async function main() {
  console.log("\n🔨 Building sqlite-vec index inside aleph.db...\n")

  if (!fs.existsSync(DB_PATH)) {
    console.error(`  ❌ ${DB_PATH} not found. Run: bun run build:bible`)
    process.exit(1)
  }

  const modelDir = findModelDir()
  if (!modelDir) {
    console.error("  ❌ ONNX model not found under models/qwen3-embedding-0.6b-int8/")
    console.error("     Run: bun run download:model")
    process.exit(1)
  }

  const modelFile = fs.existsSync(path.join(modelDir, "model_quantized.onnx"))
    ? path.join(modelDir, "model_quantized.onnx")
    : path.join(modelDir, "model.onnx")
  console.log(`  📦 Model: ${modelFile}`)
  console.log(`  📦 Tokenizer: ${path.join(modelDir, "tokenizer.json")}`)

  // Load tokenizer + ONNX session (same logic as electron/services/detection/semantic.ts)
  // Use dynamic require to avoid ESM/CJS interop issues
  const ort = await import("onnxruntime-node")
  const { AutoTokenizer } = await import("@huggingface/transformers")

  console.log("  🔧 Loading tokenizer...")
  const tok: any = await (AutoTokenizer as any).from_pretrained(modelDir, { local_files_only: true })

  console.log("  🔧 Loading ONNX session...")
  const session = await (ort as any).InferenceSession.create(modelFile, {
    graphOptimizationLevel: "all",
  })
  const outputNames: string[] = session.outputNames ?? []
  const hasSentenceEmbedding = outputNames.includes("sentence_embedding")
  console.log(`  Outputs: ${outputNames.join(", ")} ${hasSentenceEmbedding ? "(sentence_embedding)" : "(mean-pool)"}`)

  // Open DB and load vec extension (allowExtension needed for vec0)
  const db = new Database(DB_PATH, { allowExtension: true } as any)
  vec.load(db as any)
  console.log(`  ✅ sqlite-vec ${ (db.prepare("SELECT vec_version()").get() as any)["vec_version()"] }`)

  // Determine embedding dim with a probe
  console.log("  🔍 Probing embedding dim...")
  const probeVec = await embedOne("In the beginning God created the heavens and the earth.", tok, session, hasSentenceEmbedding, ort)
  if (!probeVec) throw new Error("probe embed failed")
  const dim = probeVec.length
  console.log(`  📐 Dim: ${dim}`)

  // Recreate virtual table
  db.exec("DROP TABLE IF EXISTS vec_verses")
  db.exec(`CREATE VIRTUAL TABLE vec_verses USING vec0(verse_id INTEGER PRIMARY KEY, embedding FLOAT[${dim}] distance_metric=cosine)`)
  console.log("  🗄 Created vec_verses")

  // Load KJV verses
  const verses = db.prepare("SELECT id, text FROM verses WHERE translation_id = 1 ORDER BY id").all() as Array<{ id: number; text: string }>
  console.log(`  📖 ${verses.length} KJV verses`)

  // sqlite-vec parameterized INSERT via `?` is broken with better-sqlite3 12.x — use exec with JSON literal
  const insertMany = db.transaction((rows: Array<{ id: number; vec: Float32Array }>) => {
    for (const r of rows) {
      const json = `[${Array.from(r.vec).join(",")}]`
      db.exec(`INSERT INTO vec_verses(verse_id, embedding) VALUES (${r.id}, '${json}')`)
    }
  })

  let done = 0
  const t0 = Date.now()
  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const batch = verses.slice(i, i + BATCH_SIZE)
    const vecs = await embedBatch(batch.map((v) => v.text), tok, session, hasSentenceEmbedding, ort)
    const rows = batch.map((v, idx) => ({ id: v.id, vec: vecs[idx] }))
    insertMany(rows)
    done += batch.length
    if (done % 320 === 0 || done === verses.length) {
      const elapsed = (Date.now() - t0) / 1000
      const rate = done / Math.max(elapsed, 0.1)
      const remain = (verses.length - done) / Math.max(rate, 1)
      console.log(`  ${done}/${verses.length} (${rate.toFixed(0)}/s, ~${(remain/60).toFixed(1)}m left)`)
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n  ✅ Done in ${elapsed}s`)

  // Verify
  const count = (db.prepare("SELECT COUNT(*) as c FROM vec_verses").get() as any).c
  console.log(`  🔍 vec_verses rows: ${count}`)
  const probe = db.prepare("SELECT verse_id, distance FROM vec_verses WHERE embedding MATCH ? ORDER BY distance LIMIT 3").all(probeVec) as any[]
  console.log(`  🔍 probe query (should hit Genesis 1:1):`, probe.slice(0, 2))

  db.exec("PRAGMA optimize")
  db.close()
  console.log(`\n✅ aleph.db now contains vec_verses (${dim}d, ${count} rows)\n`)
}

async function embedBatch(texts: string[], tok: any, session: any, hasSentenceEmbedding: boolean, ort: any): Promise<Float32Array[]> {
  // Tokenize batch with padding/truncation to MAX_TOKENS
  const enc = tok(texts, {
    padding: true,
    truncation: true,
    max_length: MAX_TOKENS,
    return_tensors: undefined,
  })

  // enc.input_ids / attention_mask may be arrays of arrays
  const inputIds: number[][] = enc.input_ids.tolist ? enc.input_ids.tolist() : enc.input_ids
  const attentionMask: number[][] = enc.attention_mask.tolist ? enc.attention_mask.tolist() : enc.attention_mask

  // Pad to MAX_TOKENS manually if needed (tok with padding:true already pads to longest)
  // Ensure 2D arrays
  const ids2d: number[][] = Array.isArray(inputIds[0]) ? inputIds as unknown as number[][] : [inputIds as unknown as number[]]
  const mask2d: number[][] = Array.isArray(attentionMask[0]) ? attentionMask as unknown as number[][] : [attentionMask as unknown as number[]]

  const batchSize = ids2d.length
  const seqLen = ids2d[0].length

  // Flatten to BigInt64
  const flatIds = new BigInt64Array(batchSize * seqLen)
  const flatMask = new BigInt64Array(batchSize * seqLen)
  const flatPos = new BigInt64Array(batchSize * seqLen)
  for (let b = 0; b < batchSize; b++) {
    for (let s = 0; s < seqLen; s++) {
      const idx = b * seqLen + s
      flatIds[idx] = BigInt(ids2d[b][s] ?? 0)
      flatMask[idx] = BigInt(mask2d[b][s] ?? 0)
      flatPos[idx] = BigInt(s)
    }
  }

  const inputIdsT = new ort.Tensor("int64", flatIds, [batchSize, seqLen])
  const attnMaskT = new ort.Tensor("int64", flatMask, [batchSize, seqLen])
  const posIdsT = new ort.Tensor("int64", flatPos, [batchSize, seqLen])

  const feeds: Record<string, any> = {
    input_ids: inputIdsT,
    attention_mask: attnMaskT,
    position_ids: posIdsT,
  }

  const output = await session.run(feeds)
  let embeddings: Float32Array[] = []

  if (hasSentenceEmbedding && output.sentence_embedding) {
    const data: Float32Array = output.sentence_embedding.data as Float32Array
    const dims: number[] = output.sentence_embedding.dims
    const dim = dims[dims.length - 1]
    for (let b = 0; b < batchSize; b++) {
      const vec = data.slice(b * dim, (b + 1) * dim)
      // L2 normalize
      let norm = 0
      for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i]
      norm = Math.sqrt(norm) || 1
      for (let i = 0; i < vec.length; i++) vec[i] /= norm
      embeddings.push(vec)
    }
  } else {
    const hidden = output.last_hidden_state ?? output.token_embeddings
    const data: Float32Array = hidden.data as Float32Array
    const dims: number[] = hidden.dims // [batch, seqLen, dim]
    const dim = dims[2]
    for (let b = 0; b < batchSize; b++) {
      const vec = new Float32Array(dim)
      let count = 0
      for (let s = 0; s < seqLen; s++) {
        if (mask2d[b][s] === 0) continue
        count++
        for (let d = 0; d < dim; d++) vec[d] += data[(b * seqLen + s) * dim + d]
      }
      for (let d = 0; d < dim; d++) vec[d] /= Math.max(1, count)
      let norm = 0
      for (let d = 0; d < dim; d++) norm += vec[d] * vec[d]
      norm = Math.sqrt(norm) || 1
      for (let d = 0; d < dim; d++) vec[d] /= norm
      embeddings.push(vec)
    }
  }
  return embeddings
}

async function embedOne(text: string, tok: any, session: any, hasSentenceEmbedding: boolean, ort: any): Promise<Float32Array | null> {
  const arr = await embedBatch([text], tok, session, hasSentenceEmbedding, ort)
  return arr[0] ?? null
}

main().catch((e) => {
  console.error("❌ build-vec-index failed:", e)
  process.exit(1)
})
