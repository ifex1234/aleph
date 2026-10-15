import { describe, expect, it } from "vitest"
import { stanzaHtmlToText, stanzaLabel, stanzasToLyricVerses } from "./hymn-content"

describe("stanzaLabel", () => {
  it("maps numbers to Verse N", () => {
    expect(stanzaLabel("1")).toBe("Verse 1")
    expect(stanzaLabel("12")).toBe("Verse 12")
  })

  it("maps chorus and end-note", () => {
    expect(stanzaLabel("chorus")).toBe("Chorus")
    expect(stanzaLabel("Chorus")).toBe("Chorus")
    expect(stanzaLabel("end-note")).toBe("Note")
  })
})

describe("stanzaHtmlToText", () => {
  it("converts br tags to newlines", () => {
    expect(stanzaHtmlToText("a<br/>b<br>c")).toBe("a\nb\nc")
  })

  it("strips other tags and decodes entities", () => {
    expect(stanzaHtmlToText("<p>a &amp; b</p>")).toBe("a & b")
  })
})

describe("stanzasToLyricVerses", () => {
  it("maps stanzas to labeled lyric verses", () => {
    const verses = stanzasToLyricVerses([
      { id: 91, hymnId: "E19", no: "1", text: "line1<br/>line2", order: 91 },
      { id: 92, hymnId: "E19", no: "chorus", text: "chorus<br/>here", order: 92 },
    ])
    expect(verses).toHaveLength(2)
    expect(verses[0]).toEqual({ label: "Verse 1", text: "line1\nline2" })
    expect(verses[1]).toEqual({ label: "Chorus", text: "chorus\nhere" })
  })
})
