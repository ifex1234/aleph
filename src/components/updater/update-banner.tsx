import { DownloadIcon, RotateCcwIcon, SparklesIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUpdaterStore } from "@/stores"
import { cn } from "@/lib/utils"

/**
 * Floating in-app update pill. Covers the ask-first surfaces:
 * - available: offer the download (hidden if the user dismissed that version)
 * - downloading: quiet progress
 * - ready: prominent restart call to action
 */
export function UpdateBanner() {
  const { enabled, phase, version, percent, dismissedVersion } = useUpdaterStore()
  const download = useUpdaterStore((s) => s.download)
  const install = useUpdaterStore((s) => s.install)
  const dismiss = useUpdaterStore((s) => s.dismiss)

  if (!enabled || phase === "idle") return null
  if (phase === "available" && version === dismissedVersion) return null

  return (
    <div
      className="fixed top-3 left-1/2 z-50 -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-full border bg-card/95 py-1.5 pr-1.5 pl-3 shadow-lg backdrop-blur-sm",
          phase === "ready"
            ? "border-primary/50"
            : "border-border"
        )}
      >
        {phase === "ready" ? (
          <>
            <SparklesIcon className="size-3.5 shrink-0 text-primary" />
            <span className="text-xs font-medium whitespace-nowrap">
              Aleph {version} is ready to install
            </span>
            <Button
              size="sm"
              className="h-6 rounded-full px-3 text-xs"
              onClick={install}
            >
              <RotateCcwIcon className="mr-1.5 size-3" />
              Restart now
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Install later, on quit"
              className="size-6 rounded-full"
              onClick={dismiss}
            >
              <XIcon className="size-3.5" />
            </Button>
          </>
        ) : phase === "downloading" ? (
          <>
            <DownloadIcon className="size-3.5 shrink-0 text-primary" />
            <span className="text-xs font-medium whitespace-nowrap">
              Downloading Aleph {version}…
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {percent}%
            </span>
          </>
        ) : (
          <>
            <SparklesIcon className="size-3.5 shrink-0 text-primary" />
            <span className="text-xs font-medium whitespace-nowrap">
              Aleph {version} is available
            </span>
            <Button
              size="sm"
              className="h-6 rounded-full px-3 text-xs"
              onClick={download}
            >
              <DownloadIcon className="mr-1.5 size-3" />
              Download now
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Dismiss, remind on quit"
              className="size-6 rounded-full"
              onClick={dismiss}
            >
              <XIcon className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
