/**
 * Merges direct + semantic detections with auto-queue cooldowns.
 * Ported from crates/detection/src/merger.rs.
 */
import type { Detection } from "./detector"

export interface MergedDetection {
  detection: Detection
  auto_queued: boolean
}

export class DetectionMerger {
  private confidenceThreshold = 0.45
  private autoQueueThreshold = 0.8
  private cooldownMs = 2500
  private lastAutoDisplay: number | null = null

  merge(direct: Detection[], semantic: Detection[]): MergedDetection[] {
    const all: Detection[] = [...direct]

    for (const s of semantic) {
      const dominated = all.some(
        (d) =>
          d.source === "direct" &&
          d.verse_ref.book_number === s.verse_ref.book_number &&
          d.verse_ref.chapter === s.verse_ref.chapter &&
          d.verse_ref.verse_start === s.verse_ref.verse_start
      )
      if (!dominated) all.push(s)
    }

    all.sort((a, b) => b.confidence - a.confidence)

    const filtered = all.filter((d) => d.confidence >= this.confidenceThreshold)

    const now = Date.now()
    const cooldownOk =
      this.lastAutoDisplay === null || now - this.lastAutoDisplay >= this.cooldownMs

    const results: MergedDetection[] = []
    for (const detection of filtered) {
      const autoQueued = detection.confidence >= this.autoQueueThreshold && cooldownOk
      if (autoQueued) this.lastAutoDisplay = now
      results.push({ detection, auto_queued: autoQueued })
    }
    return results
  }

  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = threshold
  }
  setAutoQueueThreshold(threshold: number): void {
    this.autoQueueThreshold = threshold
  }
  setCooldownMs(ms: number): void {
    this.cooldownMs = ms
  }
}
