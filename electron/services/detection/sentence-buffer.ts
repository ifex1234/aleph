/**
 * Accumulates final transcript fragments into sentences before detection.
 * Ported from crates/detection/src/sentence_buffer.rs.
 */
const DEFAULT_FLUSH_TIMEOUT_MS = 3000

export class SentenceBuffer {
  private buffer = ""
  private lastAppend: number | null = null
  private flushTimeoutMs = DEFAULT_FLUSH_TIMEOUT_MS

  append(text: string): string | null {
    if (!text) return null
    if (this.buffer) this.buffer += " "
    this.buffer += text
    this.lastAppend = Date.now()

    const trimmed = this.buffer.trimEnd()
    if (
      trimmed.endsWith(".") ||
      trimmed.endsWith("!") ||
      trimmed.endsWith("?")
    ) {
      return this.flush()
    }
    return null
  }

  checkTimeout(): string | null {
    if (!this.buffer) return null
    if (this.lastAppend !== null && Date.now() - this.lastAppend >= this.flushTimeoutMs) {
      return this.flush()
    }
    return null
  }

  forceFlush(): string | null {
    if (!this.buffer) return null
    return this.flush()
  }

  hasContent(): boolean {
    return this.buffer !== ""
  }

  private flush(): string {
    const text = this.buffer.trim()
    this.buffer = ""
    this.lastAppend = null
    return text
  }
}
