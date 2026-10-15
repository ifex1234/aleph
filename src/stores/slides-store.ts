import { create } from "zustand"
import { load, type Store } from "@tauri-apps/plugin-store"
import type { ImageSlide, SlideMediaKind } from "@/types"

/** Pick a slide kind from MIME type, falling back to the file extension. */
export function kindFromMimeType(
  mimeType: string | undefined,
  fileName: string
): SlideMediaKind {
  if (mimeType?.startsWith("video/")) return "video"
  if (mimeType === "application/pdf") return "pdf"
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  if (["mp4", "webm", "mov", "m4v", "ogv", "ogg"].includes(ext)) return "video"
  if (ext === "pdf") return "pdf"
  return "image"
}

/** Resolve a slide's kind, defaulting decks saved before video/PDF support to image. */
export function resolveSlideKind(slide: {
  kind?: SlideMediaKind
  mimeType?: string
  name?: string
}): SlideMediaKind {
  if (slide.kind === "video" || slide.kind === "pdf" || slide.kind === "image") {
    return slide.kind
  }
  return kindFromMimeType(slide.mimeType, slide.name ?? "")
}

interface SlidesState {
  slides: ImageSlide[]
  isSidebarOpen: boolean

  // Actions
  addSlides: (slides: Omit<ImageSlide, "id">[]) => void
  removeSlide: (id: string) => void
  moveSlide: (id: string, direction: -1 | 1) => void
  renameSlide: (id: string, name: string) => void
  clearSlides: () => void
  setSidebarOpen: (open: boolean) => void
}

let tauriStore: Store | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
const SAVE_DEBOUNCE_MS = 500

async function getSlidesStore(): Promise<Store> {
  if (!tauriStore) {
    tauriStore = await load("slides.json", { autoSave: false, defaults: {} })
  }
  return tauriStore
}

async function persistSlides(slides: ImageSlide[]): Promise<void> {
  try {
    const store = await getSlidesStore()
    await store.set("slides", slides)
    await store.save()
  } catch {
    console.warn("[slides] Failed to persist slides")
  }
}

function schedulePersist(get: () => ImageSlide[]): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void persistSlides(get())
  }, SAVE_DEBOUNCE_MS)
}

export const useSlidesStore = create<SlidesState>((set, get) => ({
  slides: [],
  isSidebarOpen: false,

  addSlides: (newSlides) => {
    const withIds: ImageSlide[] = newSlides.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
    }))
    set((state) => ({ slides: [...state.slides, ...withIds] }))
    schedulePersist(() => get().slides)
  },

  removeSlide: (id) => {
    set((state) => ({ slides: state.slides.filter((s) => s.id !== id) }))
    schedulePersist(() => get().slides)
  },

  moveSlide: (id, direction) => {
    set((state) => {
      const index = state.slides.findIndex((s) => s.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= state.slides.length) return state
      const slides = [...state.slides]
      const [moved] = slides.splice(index, 1)
      slides.splice(target, 0, moved)
      return { slides }
    })
    schedulePersist(() => get().slides)
  },

  renameSlide: (id, name) => {
    set((state) => ({
      slides: state.slides.map((s) => (s.id === id ? { ...s, name } : s)),
    }))
    schedulePersist(() => get().slides)
  },

  clearSlides: () => {
    set({ slides: [] })
    schedulePersist(() => get().slides)
  },

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
}))

export async function hydrateSlidesStore(): Promise<void> {
  try {
    const store = await getSlidesStore()
    const slides = (await store.get("slides")) as ImageSlide[] | undefined
    if (slides && Array.isArray(slides)) {
      // Backfill kind/mimeType for decks saved before video/PDF support.
      useSlidesStore.setState({
        slides: slides.map((s) => ({
          ...s,
          kind: resolveSlideKind(s),
        })),
      })
    }
  } catch {
    console.warn("[slides] Failed to load persisted slides")
  }
}
