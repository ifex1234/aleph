import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs so Electron can load the built renderer over file://.
  base: "./",
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 3000,
    strictPort: true,
    watch: {
      // Keep the watcher out of multi-GB non-frontend dirs (native models,
      // NDI SDK, bible data) and our own Electron output. Crawling them
      // blocks the dev server's event loop for minutes on Windows, so the
      // app windows load before Vite can respond and stay white.
      ignored: [
        "**/models/**",
        "**/embeddings/**",
        "**/sdk/**",
        "**/data/**",
        "**/build/**",
        "**/dist-electron/**",
        "**/release/**",
      ],
    },
  },
  build: {
    outDir: "build",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        broadcast: path.resolve(__dirname, "broadcast-output.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),

      // The installed lucide-react@1.34 / fabric@7 tarballs ship broken
      // entry metadata ("module" points at files that don't exist), so pin
      // the resolver to their existing bundles directly.
      "lucide-react": path.resolve(
        __dirname,
        "node_modules/lucide-react/dist/cjs/lucide-react.js"
      ),
      fabric: path.resolve(__dirname, "node_modules/fabric/dist/index.js"),

      // Electron compat shims standing in for the Tauri APIs the frontend
      // was written against. Same function signatures, backed by IPC.
      "@tauri-apps/api/core": path.resolve(__dirname, "./src/compat/core.ts"),
      "@tauri-apps/api/event": path.resolve(__dirname, "./src/compat/event.ts"),
      "@tauri-apps/api/webviewWindow": path.resolve(
        __dirname,
        "./src/compat/webviewWindow.ts"
      ),
      "@tauri-apps/api/window": path.resolve(__dirname, "./src/compat/window.ts"),
      "@tauri-apps/api/app": path.resolve(__dirname, "./src/compat/app.ts"),
      "@tauri-apps/api/path": path.resolve(__dirname, "./src/compat/path.ts"),
      "@tauri-apps/plugin-dialog": path.resolve(__dirname, "./src/compat/dialog.ts"),
      "@tauri-apps/plugin-fs": path.resolve(__dirname, "./src/compat/fs.ts"),
      "@tauri-apps/plugin-log": path.resolve(__dirname, "./src/compat/log.ts"),
      "@tauri-apps/plugin-store": path.resolve(__dirname, "./src/compat/store.ts"),
    },
  },
})
