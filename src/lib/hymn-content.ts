import type { HymnStanza } from "@/types"

/** "1" -> "Verse 1", "chorus" -> "Chorus", "end-note" -> "Note". */
export function stanzaLabel(no: string): string {
  const normalized = no.trim().toLowerCase()
  if (normalized === "chorus") return "Chorus"
  if (normalized === "end-note" || normalized === "endnote") return "Note"
  if (/^\d+$/.test(normalized)) return `Verse ${Number(normalized)}`
  return no
}

/** Stanza HTML ("a<br/>b") -> plain verse text with newlines. */
export function stanzaHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim()
}

/** Stanzas -> lyric verses for the live-output LyricsSlideContent pipeline. */
export function stanzasToLyricVerses(stanzas: HymnStanza[]): Array<{ label: string; text: string }> {
  return stanzas.map((s) => ({
    label: stanzaLabel(s.no),
    text: stanzaHtmlToText(s.text ?? ""),
  }))
}
