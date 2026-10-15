import { create } from "zustand"
import { load, type Store } from "@tauri-apps/plugin-store"

export interface Song {
  id: string
  title: string
  artiste: string
  lyrics: string
  createdAt: number
  updatedAt: number
}

interface LyricsState {
  songs: Song[]
  activeSongId: string | null
  isSidebarOpen: boolean

  // Actions
  addSong: (song: Omit<Song, "id" | "createdAt" | "updatedAt">) => string
  updateSong: (id: string, updates: Partial<Song>) => void
  deleteSong: (id: string) => void
  setActiveSong: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  getActiveSong: () => Song | null
  importSongs: (songs: Song[]) => void
}

let tauriStore: Store | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
const SAVE_DEBOUNCE_MS = 500

async function getLyricsStore(): Promise<Store> {
  if (!tauriStore) {
    tauriStore = await load("lyrics.json", { autoSave: false, defaults: { songs: [] } })
  }
  return tauriStore
}

async function persistSongs(songs: Song[]): Promise<void> {
  try {
    const store = await getLyricsStore()
    await store.set("songs", songs)
    await store.save()
  } catch {
    console.warn("[lyrics] Failed to persist songs")
  }
}

export const useLyricsStore = create<LyricsState>((set, get) => ({
  songs: [],
  activeSongId: null,
  isSidebarOpen: false,

  addSong: (songData) => {
    const newSong: Song = {
      ...songData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set((state) => ({
      songs: [newSong, ...state.songs],
      activeSongId: newSong.id,
    }))
    setTimeout(() => persistSongs(get().songs), 0)
    return newSong.id
  },

  updateSong: (id, updates) => {
    set((state) => ({
      songs: state.songs.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
      ),
    }))
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => persistSongs(get().songs), SAVE_DEBOUNCE_MS)
  },

  deleteSong: (id) => {
    set((state) => ({
      songs: state.songs.filter((s) => s.id !== id),
      activeSongId: state.activeSongId === id ? null : state.activeSongId,
    }))
    persistSongs(get().songs)
  },

  setActiveSong: (id) => set({ activeSongId: id }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  getActiveSong: () => {
    const { songs, activeSongId } = get()
    return songs.find((s) => s.id === activeSongId) ?? null
  },

  importSongs: (importedSongs: Song[]) => {
    set((state) => {
      const existingIds = new Set(state.songs.map((s) => s.id))
      const newSongs = importedSongs.filter((s) => !existingIds.has(s.id))
      return { songs: [...newSongs, ...state.songs] }
    })
    persistSongs(get().songs)
  },
}))

export async function hydrateLyricsStore(): Promise<void> {
  try {
    const store = await getLyricsStore()
    const songs = (await store.get("songs")) as Song[] | undefined
    if (songs && Array.isArray(songs)) {
      useLyricsStore.setState({ songs })
    }
  } catch {
    console.warn("[lyrics] Failed to load persisted songs")
  }
}