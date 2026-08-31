import fs from "node:fs"
import path from "node:path"
import { modelDirCandidates, embeddingFileCandidates } from "../paths"
import { warn } from "../logger"
import { hasVecIndex, searchVecVerses } from "../bible"

/**
 * Optional semantic (embedding) search. Loads the same assets the Rust
 * backend used:
 *   models/qwen3-embedding-0.6b[-int8]/…  + tokenizer.json
 *   embeddings/kjv-qwen3-0.6b.bin         (flat f32 vectors)
 *   embeddings/kjv-qwen3-0.6b-ids.bin     (flat i64 verse ids)
 *
 * Assets are resolved across the bundled resources dir and the per-user
 * download dir (see paths.assetRoots); when missing in packaged builds the
 * semantic-download service fetches them on first run. Requires
 * `onnxruntime-node`; when it or the model files are missing the embedder
 * reports unavailable and the app degrades to direct + FTS5 detection only.
 */

export interface EmbedderStatus {
  available: boolean
  warning: string | null
}

interface LoadedIndex {
  dim: number
  count: number
  vectors: Float32Array
  ids: BigInt64Array
}

let session: unknown | null = null
let tokenizer: {
  encode: (text: string) => { ids: number[]; attention_mask: number[] }
} | null = null
let index: LoadedIndex | null = null
let modelFile = ""
let loadAttempted = false
let unavailableReason: string | null = null

const MAX_TOKENS = 128

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

function findModelDir(): string | null {
  // INT8 is preferred everywhere (571MB vs 2.4GB, >99% quality); fp32 is a
  // dev-checkout fallback.
  const variants = ["qwen3-embedding-0.6b-int8", "qwen3-embedding-0.6b"]
  for (const variant of variants) {
    for (const dir of modelDirCandidates(variant)) {
      const file = variant.endsWith("int8") ? "model_quantized.onnx" : "model.onnx"
      if (fs.existsSync(path.join(dir, file))) return dir
    }
  }
  return null
}

/**
 * True when any semantic-search asset is absent from every known location,
 * i.e. the first-run downloader still has work to do.
 * With sqlite-vec, the vec_verses table inside aleph.db satisfies the index
 * — flat .bin files are a legacy fallback.
 */
export function assetsMissing(): boolean {
  if (findModelDir() === null) return true
  if (hasVecIndex()) return false
  return (
    resolveEmbeddingFile("kjv-qwen3-0.6b.bin") === null ||
    resolveEmbeddingFile("kjv-qwen3-0.6b-ids.bin") === null
  )
}

/** Resolves an embeddings index file across bundled + downloaded locations. */
function resolveEmbeddingFile(name: string): string | null {
  return firstExisting(embeddingFileCandidates(name))
}

export function embeddingStatus(): EmbedderStatus {
  const modelDir = findModelDir()
  if (!modelDir) {
    return {
      available: false,
      warning: "Semantic search disabled: ONNX embedding model not found under models/.",
    }
  }
  // sqlite-vec path: no flat .bin needed
  if (hasVecIndex()) {
    void load()
    return { available: tokenizer !== null && session !== null, warning: unavailableReason }
  }
  const embeddingsBin = resolveEmbeddingFile("kjv-qwen3-0.6b.bin")
  const idsBin = resolveEmbeddingFile("kjv-qwen3-0.6b-ids.bin")
  if (!embeddingsBin || !idsBin) {
    return { available: false, warning: null }
  }
  void load()
  return { available: index !== null && tokenizer !== null, warning: unavailableReason }
}

/** Lazily load onnxruntime-node, tokenizer, and the vector index. */
function load(): void {
  if (loadAttempted) return
  loadAttempted = true

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ort = require("onnxruntime-node")
    const modelDir = findModelDir()!
    const modelPath = path.join(modelDir, fs.existsSync(path.join(modelDir, "model_quantized.onnx")) ? "model_quantized.onnx" : "model.onnx")

    session = new ort.InferenceSession(modelPath, {
      graphOptimizationLevel: "all",
    })
    modelFile = path.basename(modelPath)

    // Tokenizer: prefer the tokenizer.json shipped/downloaded next to the
    // model so production runs fully offline; fall back to the HF hub id
    // (dev convenience only — it caches outside our control).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tf = require("@huggingface/transformers")
    const localTokenizer = path.join(modelDir, "tokenizer.json")
    const hasLocalTokenizer = fs.existsSync(localTokenizer)
    if (!hasLocalTokenizer) {
      warn("[semantic] tokenizer.json not found next to model; fetching from the HF hub")
    }
    const tok = tf.AutoTokenizer.fromSync(
      hasLocalTokenizer ? modelDir : "Qwen/Qwen3-Embedding-0.6B",
      { localFilesOnly: hasLocalTokenizer }
    )
    tokenizer = {
      encode: (text: string) => {
        const enc = tok(text, {
          padding: "max_length",
          truncation: true,
          max_length: MAX_TOKENS,
          return_tensor_ids: true,
        })
        return { ids: enc.input_ids.data as number[], attention_mask: enc.attention_mask.data as number[] }
      },
    }

    // Legacy flat .bin path: only if vec table absent
    if (!hasVecIndex()) {
      const vectorsPath = resolveEmbeddingFile("kjv-qwen3-0.6b.bin")!
      const idsPath = resolveEmbeddingFile("kjv-qwen3-0.6b-ids.bin")!
      const vectorsBuf = fs.readFileSync(vectorsPath)
      const idsBuf = fs.readFileSync(idsPath)
      const vectors = new Float32Array(
        vectorsBuf.buffer.slice(vectorsBuf.byteOffset, vectorsBuf.byteOffset + vectorsBuf.byteLength)
      )
      const ids = new BigInt64Array(
        idsBuf.buffer.slice(idsBuf.byteOffset, idsBuf.byteOffset + idsBuf.byteLength)
      )
      if (vectors.length % ids.length !== 0) {
        throw new Error("embedding index size mismatch between .bin and -ids.bin")
      }
      index = { dim: vectors.length / ids.length, count: ids.length, vectors, ids }
    }
  } catch (e) {
    unavailableReason =
      e instanceof Error && /tokenizer/.test(e.message)
        ? "Semantic search disabled: no tokenizer available."
        : "Semantic search disabled: onnxruntime-node is missing or the embedding model failed to load."
    warn(`[semantic] ${unavailableReason}`, e)
    session = null
    tokenizer = null
    index = null
  }
}

/**
 * Drops all cached load state so the next status check retries from disk.
 * Called after the first-run downloader finishes fetching assets.
 */
export function resetForReload(): void {
  loadAttempted = false
  unavailableReason = null
  session = null
  tokenizer = null
  index = null
}

/** Mean-pool + L2-normalize a text into an embedding vector. */
export async function embed(text: string): Promise<Float32Array | null> {
  if (!session || !tokenizer) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ort = require("onnxruntime-node")
  const { ids, attention_mask } = tokenizer.encode(`query: ${text}`)

  const inputIds = new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length])
  const attnMask = new ort.Tensor(
    "int64",
    BigInt64Array.from(attention_mask.map(BigInt)),
    [1, attention_mask.length]
  )
  const positionIds = new ort.Tensor(
    "int64",
    BigInt64Array.from({ length: ids.length }, (_, i) => BigInt(i)),
    [1, ids.length]
  )

  const feeds: Record<string, unknown> = {
    input_ids: inputIds,
    attention_mask: attnMask,
    position_ids: positionIds,
  }
  const output = await (session as { run: (f: unknown) => Promise<Record<string, { data: Float32Array; dims: number[] }>> }).run(feeds)

  // Prefer a pre-pooled sentence_embedding output; else mean-pool tokens.
  let vec: Float32Array
  const sentence = output["sentence_embedding"]
  if (sentence) {
    vec = sentence.data.slice(0, sentence.dims[sentence.dims.length - 1])
  } else {
    const hidden = output["last_hidden_state"] ?? output["token_embeddings"]
    if (!hidden) return null
    const dim = hidden.dims[hidden.dims.length - 1]
    vec = new Float32Array(dim)
    for (let t = 0; t < attention_mask.length; t++) {
      if (attention_mask[t] === 0) continue
      for (let d = 0; d < dim; d++) vec[d] += hidden.data[t * dim + d]
    }
    for (let d = 0; d < dim; d++) vec[d] /= Math.max(1, attention_mask.reduce((a, b) => a + b, 0))
  }

  let norm = 0
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i]
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < vec.length; i++) vec[i] /= norm
  return vec
}

/**
 * Cosine scan — prefers sqlite-vec (<5ms C), falls back to brute-force flat index.
 */
export function searchIndex(queryVec: Float32Array, k: number): Array<{ id: number; cosine: number }> {
  // Fast path: sqlite-vec virtual table (distance = 1 - cosine for cosine metric)
  if (hasVecIndex()) {
    try {
      const hits = searchVecVerses(queryVec, k)
      return hits.map((h) => ({ id: h.verse_id, cosine: 1 - h.distance }))
    } catch {
      // fall through to brute force
    }
  }
  if (!index || queryVec.length !== index.dim) return []
  const results: Array<{ id: number; cosine: number }> = []
  for (let n = 0; n < index.count; n++) {
    let dot = 0
    const off = n * index.dim
    for (let d = 0; d < index.dim; d++) dot += queryVec[d] * index.vectors[off + d]
    results.push({ id: Number(index.ids[n]), cosine: dot })
  }
  results.sort((a, b) => b.cosine - a.cosine)
  return results.slice(0, k)
}

export function isReady(): boolean {
  void load()
  if (hasVecIndex()) return session !== null && tokenizer !== null
  return index !== null && tokenizer !== null
}

export function loadedModelFile(): string {
  return modelFile
}
