import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { AlertTriangleIcon, DownloadIcon, XIcon } from "lucide-react"
import { useTauriEvent } from "@/hooks/use-tauri-event"
import type { DetectionStatus } from "@/types"

interface SemanticDownloadProgress {
  state: "idle" | "running" | "ready" | "failed"
  file: string | null
  bytesDone: number
  bytesTotal: number
  error: string | null
}

/**
 * Amber warning strip shown when the backend reports that the semantic
 * embedding index was built with a different ONNX model than the one the
 * app loaded (semantic results would be unreliable). Renders nothing in the
 * healthy cases: no embeddings installed, or index and model match.
 *
 * Two sources: the initial detection_status fetch (sidecar check at
 * startup) and the "embedding_warning" event pushed when the background
 * self-check — which needs no sidecar — finishes a few seconds later.
 *
 * While semantic assets are still downloading (first run of an installed
 * build), a blue progress strip shows instead.
 */
export function EmbeddingWarningBanner() {
  const [warning, setWarning] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [download, setDownload] = useState<SemanticDownloadProgress | null>(null)

  useEffect(() => {
    invoke<DetectionStatus>("detection_status")
      .then((status) => {
        if (status.embedding_warning) setWarning(status.embedding_warning)
      })
      .catch(() => {})
  }, [])

  useTauriEvent<string>("embedding_warning", (message) => {
    setWarning(message)
  })

  useTauriEvent<SemanticDownloadProgress>("semantic_download_progress", (p) => {
    setDownload(p)
    // A successful download makes the stale "not found" warning obsolete.
    if (p.state === "ready") {
      setWarning(null)
      setDismissed(false)
    }
  })

  // Always occupy the grid row — the parent grid's `auto` row collapses to
  // zero height when this is empty, and other rows keep their slots.
  const pct =
    download &&
    download.state === "running" &&
    download.bytesTotal > 0
      ? Math.min(100, Math.round((download.bytesDone / download.bytesTotal) * 100))
      : null
  if (!warning || dismissed) {
    return pct === null ? <div className="col-span-4" /> : <ProgressStrip file={download!.file} pct={pct} />
  }

  return (
    <div
      role="alert"
      className="col-span-4 flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-500"
    >
      <AlertTriangleIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{warning}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss warning"
        className="shrink-0 rounded p-1 transition-colors hover:bg-amber-500/20"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  )
}

function ProgressStrip({ file, pct }: { file: string | null; pct: number }) {
  return (
    <div className="col-span-4 flex items-center gap-2 border-b border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs text-blue-400">
      <DownloadIcon className="size-4 shrink-0 animate-pulse" />
      <span className="min-w-0 flex-1">
        Downloading {file ?? "semantic search model"}… {pct}% (semantic search will be available when this finishes)
      </span>
    </div>
  )
}
