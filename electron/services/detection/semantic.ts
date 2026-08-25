import fs from "node:fs"
import path from "node:path"
import { MODEL_DIR, EMBEDDINGS_DIR } from "../paths"
import { warn } from "../logger"

/**
 * Optional semantic (embedding) search. Loads the same assets the Rust
 * backend used:
 *   models/qwen3-embedding-0.6b[-int8]/…  + tokenizer.json
 *   embeddings/kjv-qwen3-0.6b.bin         (flat f32 vectors)
 *   embeddings/kjv-qwen3-0.6b-ids.bin     (flat i64 verse ids)
 *
 * Requires `onnxruntime-node` to be installed; when it or the model files
 * are missing the embedder reports unavailable and the app degrades to
 * direct + FTS5 detection only.
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

function findModelDir(): string | null {
  const int8 = path.join(MODEL_DIR(), "qwen3-embedding-0.6b-int8")
  const fp32 = path.join(MODEL_DIR(), "qwen3-embedding-0.6b")
  if (fs.existsSync(path.join(int8, "model_quantized.onnx"))) return int8
  if (fs.existsSync(path.join(fp32, "model.onnx"))) return fp32
  return null
}

export function embeddingStatus(): EmbedderStatus {
  const modelDir = findModelDir()
  const embeddingsBin = path.join(EMBEDDINGS_DIR(), "kjv-qwen3-0.6b.bin")
  const idsBin = path.join(EMBEDDINGS_DIR(), "kjv-qwen3-0.6b-ids.bin")

  if (!modelDir || !fs.existsSync(embeddingsBin) || !fs.existsSync(idsBin)) {
    return {
      available: false,
      warning: modelDir
        ? null
        : "Semantic search disabled: ONNX embedding model not found under models/.",
    }
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

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tokenizers = require("@huggingface/tokenizers") ?? null
    void tokenizers

    // Tokenizer: use transformers.js if present; otherwise fail soft.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tf = require("@huggingface/transformers")
      const tok = tf.AutoTokenizer.fromSync("Qwen/Qwen3-Embedding-0.6B", {
        localFilesOnly: false,
      })
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
    } catch {
      throw new Error("tokenizer unavailable (@huggingface/transformers not installed)")
    }

    const vectorsBuf = fs.readFileSync(path.join(EMBEDDINGS_DIR(), "kjv-qwen3-0.6b.bin"))
    const idsBuf = fs.readFileSync(path.join(EMBEDDINGS_DIR(), "kjv-qwen3-0.6b-ids.bin"))
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
  } catch (e) {
    unavailableReason =
      e instanceof Error && /tokenizer/.test(e.message)
        ? "Semantic search disabled: no tokenizer available."
        : "Semantic search disabled: install onnxruntime-node and place the embedding model under models/."
    warn(`[semantic] ${unavailableReason}`)
    session = null
    tokenizer = null
    index = null
  }
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
 * Brute-force cosine scan over the flat index (vectors are pre-normalized).
 */
export function searchIndex(queryVec: Float32Array, k: number): Array<{ id: number; cosine: number }> {
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
  return index !== null && tokenizer !== null
}

export function loadedModelFile(): string {
  return modelFile
}
