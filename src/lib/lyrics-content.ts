/**
 * Parse song lyrics into verses
 * Splits by blank lines (double newlines)
 */
export function parseSongLyrics(lyrics: string): LyricsVerse[] {
  const sections = lyrics
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  return sections.map((section, index) => {
    // Try to detect verse/chorus/bridge labels
    const lines = section.split("\n").filter(Boolean)
    const firstLine = lines[0].toLowerCase()
    
    let label = `Verse ${index + 1}`
    if (firstLine.includes("chorus") || firstLine.includes("refrain")) {
      label = "Chorus"
    } else if (firstLine.includes("bridge")) {
      label = "Bridge"
    } else if (firstLine.includes("pre-chorus")) {
      label = "Pre-Chorus"
    } else if (firstLine.includes("intro")) {
      label = "Intro"
    } else if (firstLine.includes("outro")) {
      label = "Outro"
    } else if (firstLine.includes("verse")) {
      // Keep as "Verse X"
    }

    return {
      label,
      text: section
    }
  })
}

export interface LyricsVerse {
  label: string
  text: string
}