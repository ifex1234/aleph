<p align="center">
  <img src="public/aleph.svg" alt="Aleph logo" width="160" height="160" />
</p>

<h1 align="center">Aleph</h1>

<p align="center">Real-time AI-powered Bible verse detection for live sermons and broadcasts. An Electron + React desktop app with a Node.js backend.</p>

Aleph listens to live sermon audio, transcribes speech in real time, detects Bible verse references (both explicit citations and quoted passages), and renders them as broadcast-ready overlays via display projection or NDI for live production.

## Features

- **Real-time speech-to-text** via Deepgram cloud streaming (WebSocket with keepalives, reconnect ladder, keyterm boosting for Bible terms)
- **Voice-controlled translation switching** — say "read in NIV" or "switch to ESV" to change translations instantly during a sermon
- **Multi-strategy verse detection**
  - Direct reference parsing (multi-pattern book matching + fuzzy Levenshtein fallback, spoken numbers, mid-speech corrections)
  - Hybrid search — FTS5 keyword leg always available; Qwen3-0.6B ONNX embedding re-ranking when models are installed
  - Quotation matching against known verse text (BM25 phrase priority)
  - Reading mode — locks to book/chapter as soon as it's mentioned, with voice navigation ("next chapter", "chapter 5 verse 2")
  - Sermon context tracking (book/chapter memory) and incomplete-reference parking ("Genesis … 3:16")
- **SQLite Bible database** with FTS5 full-text search (BM25 ranking)
- **Multi-output broadcast** — fullscreen borderless projector windows per monitor plus NDI outputs (resolution/frame-rate/alpha configurable)
- **Remote control** — OSC (`/aleph/next` …) on UDP 8000 and an HTTP API (`POST /api/v1/command`) on port 8080
- **Diagnostics** — rotating log files with one-click filtered export

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, Vite 7 |
| **Desktop shell** | Electron 40 (main process in TypeScript, bundled with esbuild) |
| **Backend services** | Node.js — better-sqlite3 (FTS5), `ws` (Deepgram), koffi FFI (NDI runtime), node:http/dgram (remote control) |
| **AI/ML (optional)** | ONNX Runtime node + Qwen3-0.6B embeddings for semantic re-ranking |
| **Renderer bridge** | A single typed IPC surface (`window.aleph`) with compat shims standing in for the old Tauri APIs |

### Architecture notes

- The renderer never talks to Node directly: `src/compat/*` mirrors the
  `@tauri-apps/*` API surface the frontend was written against and routes
  everything through one preload bridge, so UI code is shell-agnostic.
- Microphone capture runs in a hidden utility window (getUserMedia +
  ScriptProcessor → mono → gain → 16 kHz linear resample → Int16 PCM over
  IPC), which keeps capture alive across main-window reloads.
- The detection engine is a faithful port of the original Rust crate:
  same reference grammar, confidence formulas, thresholds (0.45 / 0.80 /
  2500 ms cooldown), reading-mode state machine, and RRF fusion.

## Prerequisites

- Node.js 20+ and npm (or Bun — both work; scripts below use npm)
- [Deepgram API key](https://deepgram.com/) for speech-to-text
- Optional, for semantic search: `npm i onnxruntime-node` plus the Qwen3
  embedding model under `models/` (see `data/download-model.ts`)
- Optional, for NDI output: the NDI runtime library under `sdk/ndi/`
  (see `data/download-ndi-sdk.ts`) — koffi loads it dynamically

No Rust toolchain, no CMake, no Python required for the core app.

## Getting Started

```bash
git clone <repo-url>
cd aleph
bun install
```

Native module note: `better-sqlite3` must match Electron's ABI. After a
fresh install run:

```bash
bunx electron-rebuild -f -w better-sqlite3
```

Build the Bible database (downloads sources, builds `data/aleph.db`):

```bash
npm run download:bible-data
npm run build:bible        # requires Bun, or run data/build-bible-db.ts via tsx
```

### Development

```bash
npm run dev:electron       # Vite dev server + Electron with hot reload
```

Or run them separately: `npm run dev` (renderer on :3000) and
`VITE_DEV_SERVER_URL=http://localhost:3000 npm start`.

### Production build & package

```bash
npm run electron:build     # typecheck + vite build + esbuild main/preload
npm start                  # launch the built app
npx electron-builder       # produce installers into release/
```

## Project Structure

```
aleph/
├─ src/                          # React frontend
│  ├─ compat/                    # Tauri-API-compatible shims over window.aleph
│  ├─ components/                # panels, broadcast designer, settings, ui
│  ├─ hooks/, stores/, lib/, types/
│  └─ broadcast-output.tsx       # second entry: fullscreen output renderer
├─ electron/                     # Node.js backend (main process)
│  ├─ main.ts                    # app lifecycle + IPC wiring
│  ├─ preload.ts                 # contextBridge surface
│  ├─ ipc.ts                     # command router (all ~40 commands)
│  └─ services/
│     ├─ bible.ts                # SQLite + FTS5 search tiers
│     ├─ detection/              # detector/parser/fuzzy/reading-mode/fusion…
│     ├─ stt/                    # Deepgram client + session manager
│     ├─ audio/                  # hidden capture window
│     ├─ remote/                 # OSC + HTTP dispatchers
│     ├─ ndi.ts                  # NDI sender via koffi
│     └─ windows.ts, fonts.ts, diagnostics.ts, stores.ts, logger.ts
├─ dist-electron/                # compiled main.cjs / preload.cjs (gitignored)
├─ build/                        # Vite renderer build (gitignored)
├─ data/                         # Bible data pipeline → data/aleph.db
└─ build-resources/icons/        # app icons used by electron-builder
```

## Scripts

| Script | Description |
|---|---|
| `dev` | Start Vite dev server (renderer only) |
| `dev:electron` | Vite + Electron together (hot reload) |
| `build` | TypeScript check + renderer production build |
| `electron:build` | Full build: renderer + main/preload bundles |
| `start` | Launch the built Electron app |
| `test` | Run Vitest |
| `lint` / `format` / `typecheck` | ESLint / Prettier / tsc |

## Environment Variables

Copy `.env.template` to `.env`:

| Variable | Description |
|---|---|
| `DEEPGRAM_API_KEY` | Fallback STT key when none is set in the app |
| `ALEPH_DEBUG` | Set to enable debug-level file logging |
| `ALEPH_LOG_DIR` | Override the log directory |
| `ALEPH_WHISPER_CLI` | Path to a `whisper.cpp` CLI binary for local STT (experimental) |

## Security

- The renderer runs with `contextIsolation: true`, `nodeIntegration: false`,
  and a minimal preload surface — no raw Node access in web content.
- The HTTP remote API binds `0.0.0.0` with permissive CORS by design (for
  hardware controllers). Don't expose it to untrusted networks.
