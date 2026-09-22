import { create } from "zustand"
import { load, type Store } from "@tauri-apps/plugin-store"

export interface GalleryImage {
  id: string
  name: string
  dataUrl: string
  mimeType: string
  size: number
  createdAt: number
}

interface GalleryState {
  images: GalleryImage[]
  isOpen: boolean

  // Actions
  addImage: (image: Omit<GalleryImage, "id" | "createdAt">) => void
  removeImage: (id: string) => void
  clearImages: () => void
  setOpen: (open: boolean) => void
  toggleOpen: () => void

  // Persistence
  loadImages: () => Promise<void>
}

let galleryStore: Store | null = null
let hydrationPromise: Promise<void> | null = null

async function getGalleryStore(): Promise<Store> {
  if (!galleryStore) {
    galleryStore = await load("gallery-images.json", { autoSave: false, defaults: {} })
  }
  return galleryStore
}

export const useGalleryStore = create<GalleryState>((set) => ({
  images: [],
  isOpen: false,

  addImage: (image) =>
    set((s) => ({
      images: [
        ...s.images,
        { ...image, id: crypto.randomUUID(), createdAt: Date.now() },
      ],
    })),

  removeImage: (id) =>
    set((s) => ({ images: s.images.filter((img) => img.id !== id) })),

  clearImages: () => set({ images: [] }),

  setOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  loadImages: async () => {
    try {
      const store = await getGalleryStore()
      const images = (await store.get("images")) as GalleryImage[] | undefined
      if (images && Array.isArray(images)) {
        set({ images })
      }
    } catch {
      console.warn("[gallery] Failed to load persisted images")
    }
  },
}))

// Auto-persist on changes (debounced)
let saveTimer: ReturnType<typeof setTimeout> | null = null

useGalleryStore.subscribe((state, prevState) => {
  if (state.images !== prevState.images) {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      saveTimer = null
      try {
        const store = await getGalleryStore()
        await store.set("images", state.images)
        await store.save()
      } catch {
        console.warn("[gallery] Failed to persist images")
      }
    }, 500)
  }
})

export async function hydrateGalleryImages(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = useGalleryStore.getState().loadImages()
  return hydrationPromise
}