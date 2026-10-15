import { useCallback, useEffect, useRef, useState } from "react"
import { PlayIcon, PauseIcon, RotateCcwIcon, FlagIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useTimerStore, formatMs } from "@/stores/timer-store"
import { cn } from "@/lib/utils"

export function TimerDisplay() {
  const { mode, elapsedMs, isRunning, targetMs, lapTimes } = useTimerStore()
  const start = useTimerStore((s) => s.start)
  const pause = useTimerStore((s) => s.pause)
  const reset = useTimerStore((s) => s.reset)
  const lap = useTimerStore((s) => s.lap)
  const setMode = useTimerStore((s) => s.setMode)
  const setTargetMs = useTimerStore((s) => s.setTargetMs)

  // For countdown input editing
  const [editingTarget, setEditingTarget] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync inputValue when targetMs changes (but not while editing)
  useEffect(() => {
    if (!editingTarget) {
      const totalMinutes = Math.floor(targetMs / 60000)
      const seconds = Math.floor((targetMs % 60000) / 1000)
      setInputValue(`${totalMinutes}:${seconds.toString().padStart(2, "0")}`)
    }
  }, [targetMs, editingTarget])

  const handleInputBlur = useCallback(() => {
    if (!editingTarget) return
    setEditingTarget(false)
    const parts = inputValue.split(":").map(Number)
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const totalMs = (parts[0] * 60 + parts[1]) * 1000
      if (totalMs > 0) setTargetMs(totalMs)
    }
  }, [editingTarget, inputValue, setTargetMs])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputBlur()
      inputRef.current?.blur()
    } else if (e.key === "Escape") {
      setEditingTarget(false)
      inputRef.current?.blur()
    }
  }, [handleInputBlur])

  const displayMs = mode === "countdown" ? Math.max(0, targetMs - elapsedMs) : elapsedMs
  const isCritical = mode === "countdown" && displayMs < 10000 && displayMs > 0
  const isExpired = mode === "countdown" && displayMs === 0 && elapsedMs > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={isRunning ? "default" : "outline"}
          className={cn(
            "w-[160px] h-8 text-sm font-mono font-medium tabular-nums transition-colors",
            isRunning && "bg-primary text-primary-foreground",
            isCritical && "animate-pulse text-destructive",
            isExpired && "bg-destructive/20 text-destructive"
          )}
        >
          {formatMs(displayMs, true)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" side="bottom" align="end">
        <div className="space-y-2">
          {/* Mode selector */}
          <div className="flex items-center gap-2">
            <Select value={mode} onValueChange={(v) => setMode(v as "stopwatch" | "countdown")}>
              <SelectTrigger className="h-7 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stopwatch">Stopwatch</SelectItem>
                <SelectItem value="countdown">Countdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Countdown target input */}
          {mode === "countdown" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0">Target</label>
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={handleInputBlur}
                  onKeyDown={handleInputKeyDown}
                  onClick={() => setEditingTarget(true)}
                  placeholder="MM:SS"
                  className="h-7 text-xs text-center"
                />
              </div>
              <Separator />
            </>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant={isRunning ? "secondary" : "default"}
              size="sm"
              className="flex-1"
              onClick={isRunning ? pause : start}
            >
              {isRunning ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={lap}
              disabled={!isRunning}
            >
              <FlagIcon className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={reset}
            >
              <RotateCcwIcon className="size-3.5" />
            </Button>
          </div>

          {/* Lap times */}
          {lapTimes.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 border-t pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Laps</span>
                <span>{lapTimes.length}</span>
              </div>
              {lapTimes.map((lapMs, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-mono tabular-nums px-1">
                  <span>#{i + 1}</span>
                  <span>{formatMs(lapMs)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}