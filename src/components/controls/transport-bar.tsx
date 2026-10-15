import { LevelMeter } from "@/components/ui/level-meter"
import { LiveIndicator } from "@/components/ui/live-indicator"
import { TimerDisplay } from "@/components/controls/timer-display"
import { MicIcon } from "lucide-react"
import { SettingsDialog } from "@/components/settings-dialog"
import { ThemeDesigner } from "@/components/broadcast/theme-designer"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAudioStore, useTranscriptStore } from "@/stores"

export function TransportBar() {
  const audioLevel = useAudioStore((s) => s.level)
  const isTranscribing = useTranscriptStore((s) => s.isTranscribing)

  return (
    <div
      data-slot="transport-bar"
      className="col-span-4 flex h-14 items-center justify-between border-b border-border bg-card px-3"
    >
      {/* Left: Logo + Sidebar Toggle */}
      <div className="flex items-center gap-2.5">
        <SidebarTrigger className="-ml-1" />
      </div>

      {/* Right: Audio + Status + Timer + Settings */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <MicIcon className="size-3.5 text-muted-foreground" />
          <LevelMeter level={audioLevel.rms} bars={4} />
        </div>
        <LiveIndicator active={isTranscribing} />
        <TimerDisplay />
        <ThemeDesigner />
        <SettingsDialog />
      </div>
    </div>
  )
}
