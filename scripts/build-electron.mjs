// Bundles the Electron main process and preload script with esbuild.
// Native modules (better-sqlite3, koffi) and electron itself stay external.
import { build } from "esbuild"

const watch = process.argv.includes("--watch")

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["electron/main.ts", "electron/preload.ts"],
  outdir: "dist-electron",
  // .cjs because package.json sets "type": "module".
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: "inline",
  external: [
    "electron",
    "better-sqlite3",
    "koffi",
    "ws",
    "onnxruntime-node",
    "@huggingface/transformers",
  ],
}

if (watch) {
  const ctx = await build({ ...options, watch: true })
  console.log("[build-electron] watching for changes...")
  await ctx.dispose
} else {
  await build(options)
  console.log("[build-electron] built dist-electron/main.cjs and preload.cjs")
}
