/**
 * Pre-computes verse embeddings using the ONNX model.
 * This script exports verses to a JSON file, then a Rust binary does the actual embedding.
 *
 * Usage:
 * 1. Run: bun run data/download-model.ts  (download the ONNX model first)
 * 2. Run: bun run data/compute-embeddings.ts  (export verses to JSON)
 * 3. Run: cargo run -p aleph-detection --features onnx,vector-search --bin precompute -- \
 *         --model models/qwen3-embedding-0.6b/model.onnx \
 *         --tokenizer models/qwen3-embedding-0.6b/tokenizer.json \
 *         --verses data/verses-for-embedding.json \
 *         --output-embeddings embeddings/kjv-qwen3-0.6b.bin \
 *         --output-ids embeddings/kjv-qwen3-0.6b-ids.bin
 *
 * For now, this script just exports the verses to JSON.
 * The actual embedding computation will be done via Rust.
 */

import { join, dirname } from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { SQLite as Database } from "./lib/sqlite"

const DATA_DIR = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(DATA_DIR, "aleph.db")
const OUTPUT_PATH = join(DATA_DIR, "verses-for-embedding.json")

async function main() {
  await mkdir(join(DATA_DIR, "..", "embeddings"), { recursive: true })

  console.log("\n📖 Exporting KJV verses for embedding...\n")

  const db = new Database(DB_PATH, { readonly: true })

  // Get all KJV verses (translation_id = 1)
  const verses = db
    .prepare(
      "SELECT id, book_name, chapter, verse, text FROM verses WHERE translation_id = 1 ORDER BY id"
    )
    .all() as Array<{
    id: number
    book_name: string
    chapter: number
    verse: number
    text: string
  }>

  console.log(`  Found ${verses.length} KJV verses`)

  // Write to JSON for the Rust precompute binary
  const output = verses.map((v) => ({
    id: v.id,
    text: v.text,
    ref: `${v.book_name} ${v.chapter}:${v.verse}`,
  }))

  await writeFile(OUTPUT_PATH, JSON.stringify(output))
  console.log(`  ✓ Exported to ${OUTPUT_PATH}`)
  console.log(
    `\n  Next: Run the Rust precompute binary to generate embeddings.`
  )
  console.log(
    `  This requires the ONNX model to be downloaded first (bun run data/download-model.ts)\n`
  )

  db.close()
}

main().catch((err) => {
  console.error("❌ Export failed:", err)
  process.exit(1)
})
