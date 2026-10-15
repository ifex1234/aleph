import { describe, expect, it } from "vitest"
import { verseSlideToRenderData } from "./verse-navigation"

describe("verseSlideToRenderData", () => {
  it("prefers the slide reference and keeps the verse number", () => {
    expect(
      verseSlideToRenderData({
        id: "s1",
        label: "John 3:16",
        text: "For God so loved the world",
        verseNumber: 16,
        reference: "John 3:16 (KJV)",
      })
    ).toEqual({
      reference: "John 3:16 (KJV)",
      segments: [{ verseNumber: 16, text: "For God so loved the world" }],
    })
  })

  it("falls back to the label when no reference is set", () => {
    expect(
      verseSlideToRenderData({ id: "s2", label: "Verse 2", text: "Amazing grace" })
    ).toEqual({
      reference: "Verse 2",
      segments: [{ verseNumber: undefined, text: "Amazing grace" }],
    })
  })
})
