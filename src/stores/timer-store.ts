import { create } from "zustand"

export type TimerMode = "stopwatch" | "countdown"

interface TimerState {
  mode: TimerMode
  elapsedMs: number
  targetMs: number
  isRunning: boolean
  lapTimes: number[]

  setMode: (mode: TimerMode) => void
  setTargetMs: (ms: number) => void
  start: () => void
  pause: () => void
  reset: () => void
  lap: () => void
  tick: (deltaMs: number) => void
}

let animationFrameId: number | null = null
let lastTimestamp = 0

function loop(timestamp: number) {
  const state = useTimerStore.getState()
  if (!state.isRunning) {
    animationFrameId = null
    return
  }
  const delta = lastTimestamp ? timestamp - lastTimestamp : 0
  lastTimestamp = timestamp
  state.tick(delta)
  animationFrameId = requestAnimationFrame(loop)
}

export const useTimerStore = create<TimerState>((set, get) => ({
  mode: "stopwatch",
  elapsedMs: 0,
  targetMs: 30 * 60 * 1000, // 30 minutes default
  isRunning: false,
  lapTimes: [],

  setMode: (mode) => set({ mode, elapsedMs: 0, lapTimes: [] }),
  setTargetMs: (targetMs) => set({ targetMs, elapsedMs: 0, lapTimes: [] }),
  start: () => {
    if (get().isRunning) return
    lastTimestamp = 0
    set({ isRunning: true })
    animationFrameId = requestAnimationFrame(loop)
  },
  pause: () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    set({ isRunning: false })
  },
  reset: () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    set({ elapsedMs: 0, isRunning: false, lapTimes: [] })
  },
  lap: () => {
    const { elapsedMs, lapTimes } = get()
    set({ lapTimes: [...lapTimes, elapsedMs] })
  },
  tick: (deltaMs: number) => {
    const { mode, elapsedMs, targetMs } = get()
    if (mode === "stopwatch") {
      set({ elapsedMs: elapsedMs + deltaMs })
    } else {
      const remaining = Math.max(0, targetMs - elapsedMs - deltaMs)
      set({ elapsedMs: targetMs - remaining })
      if (remaining === 0) {
        get().pause()
      }
    }
  },
}))

export function formatMs(ms: number, showMs = false): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const msPart = ms % 1000
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (h > 0) {
    return showMs ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(Math.floor(msPart / 10)).padStart(2, "0")}` : `${pad(h)}:${pad(m)}:${pad(s)}`
  }
  return showMs ? `${pad(m)}:${pad(s)}.${pad(Math.floor(msPart / 10)).padStart(2, "0")}` : `${pad(m)}:${pad(s)}`
}