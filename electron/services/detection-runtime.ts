import { DetectionPipeline } from "./detection/pipeline"
import { embeddingStatus } from "./detection/semantic"
import { sharedState } from "./state"

/**
 * Shared detection runtime: the managed DetectionPipeline equivalent used
 * by the detect_verses / semantic_search commands. (The live-STT worker
 * keeps its own DirectDetector+Merger pair in session.ts, mirroring how
 * the Rust app managed them separately.)
 */
export const pipeline = new DetectionPipeline()

export function detectionStatusResult(): {
  has_direct: boolean
  has_semantic: boolean
  embedding_warning?: string | null
} {
  const s = embeddingStatus()
  return {
    has_direct: true,
    has_semantic: s.available,
    embedding_warning: s.warning,
  }
}

export function initRuntime(): void {
  pipeline.setActiveTranslation(sharedState().activeTranslationId)
}
