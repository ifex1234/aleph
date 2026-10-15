import { beforeEach, describe, expect, it } from "vitest"
import {
  kindFromMimeType,
  resolveSlideKind,
  useSlidesStore,
} from "./slides-store"

beforeEach(() => {
  useSlidesStore.setState({ slides: [], isSidebarOpen: false })
})

function addTwo() {
  useSlidesStore.getState().addSlides([
    { name: "Welcome", dataUrl: "data:image/png;base64,AAA" },
    { name: "Announcements", dataUrl: "data:image/png;base64,BBB" },
  ])
  return useSlidesStore.getState().slides
}

describe("addSlides", () => {
  it("appends slides with generated ids", () => {
    const slides = addTwo()
    expect(slides).toHaveLength(2)
    expect(slides[0].name).toBe("Welcome")
    expect(slides[1].name).toBe("Announcements")
    expect(slides[0].id).toBeTruthy()
    expect(slides[0].id).not.toBe(slides[1].id)
  })
})

describe("removeSlide", () => {
  it("removes only the targeted slide", () => {
    const slides = addTwo()
    useSlidesStore.getState().removeSlide(slides[0].id)
    const remaining = useSlidesStore.getState().slides
    expect(remaining).toHaveLength(1)
    expect(remaining[0].name).toBe("Announcements")
  })
})

describe("moveSlide", () => {
  it("moves a slide up and down", () => {
    const slides = addTwo()
    useSlidesStore.getState().moveSlide(slides[1].id, -1)
    expect(useSlidesStore.getState().slides.map((s) => s.name)).toEqual([
      "Announcements",
      "Welcome",
    ])
    useSlidesStore
      .getState()
      .moveSlide(useSlidesStore.getState().slides[0].id, 1)
    expect(useSlidesStore.getState().slides.map((s) => s.name)).toEqual([
      "Welcome",
      "Announcements",
    ])
  })

  it("ignores out-of-bounds moves", () => {
    const slides = addTwo()
    useSlidesStore.getState().moveSlide(slides[0].id, -1)
    useSlidesStore.getState().moveSlide(slides[1].id, 1)
    expect(useSlidesStore.getState().slides.map((s) => s.name)).toEqual([
      "Welcome",
      "Announcements",
    ])
  })
})

describe("renameSlide", () => {
  it("renames the targeted slide", () => {
    const slides = addTwo()
    useSlidesStore.getState().renameSlide(slides[0].id, "Opening")
    expect(useSlidesStore.getState().slides[0].name).toBe("Opening")
  })
})

describe("kindFromMimeType", () => {
  it("detects video, pdf, and image mimes", () => {
    expect(kindFromMimeType("video/mp4", "clip.mp4")).toBe("video")
    expect(kindFromMimeType("video/quicktime", "clip.mov")).toBe("video")
    expect(kindFromMimeType("application/pdf", "notes.pdf")).toBe("pdf")
    expect(kindFromMimeType("image/png", "photo.png")).toBe("image")
  })

  it("falls back to the file extension", () => {
    expect(kindFromMimeType("", "clip.webm")).toBe("video")
    expect(kindFromMimeType(undefined, "doc.pdf")).toBe("pdf")
    expect(kindFromMimeType(undefined, "photo.jpg")).toBe("image")
  })
})

describe("resolveSlideKind", () => {
  it("prefers an explicit kind and defaults legacy slides to image", () => {
    expect(resolveSlideKind({ kind: "video" })).toBe("video")
    expect(resolveSlideKind({ kind: "pdf" })).toBe("pdf")
    expect(resolveSlideKind({ name: "old.png" })).toBe("image")
    expect(
      resolveSlideKind({ mimeType: "video/mp4", name: "clip.dat" })
    ).toBe("video")
  })
})
