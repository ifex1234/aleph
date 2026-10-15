import { create } from "zustand"
import { load, type Store } from "@tauri-apps/plugin-store"

export interface Note {
  id: string
  title: string
  content: string
  source: "transcription" | "manual"
  createdAt: number
  updatedAt: number
  tags: string[]
}

interface NotesState {
  notes: Note[]
  activeNoteId: string | null
  isSidebarOpen: boolean

  // Actions
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => string
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  setActiveNote: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  getActiveNote: () => Note | null
  // Auto-save from transcription
  appendToActiveNote: (text: string) => void
  createNoteFromTranscription: (text: string) => string
  // Import/Export
  importNotes: (notes: Note[]) => void
}

let tauriStore: Store | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
const SAVE_DEBOUNCE_MS = 500

async function getNoteStore(): Promise<Store> {
  if (!tauriStore) {
    tauriStore = await load("notes.json", { autoSave: false, defaults: { notes: [] } })
  }
  return tauriStore
}

async function persistNotes(notes: Note[]): Promise<void> {
  try {
    const store = await getNoteStore()
    await store.set("notes", notes)
    await store.save()
  } catch {
    console.warn("[notes] Failed to persist notes")
  }
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  isSidebarOpen: false,

  addNote: (noteData) => {
    const newNote: Note = {
      ...noteData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set((state) => ({
      notes: [newNote, ...state.notes],
      activeNoteId: newNote.id,
    }))
    // Persist after state update
    setTimeout(() => persistNotes(get().notes), 0)
    return newNote.id
  },

  updateNote: (id, updates) => {
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
      ),
    }))
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => persistNotes(get().notes), SAVE_DEBOUNCE_MS)
  },

  deleteNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
    }))
    persistNotes(get().notes)
  },

  setActiveNote: (id) => set({ activeNoteId: id }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  getActiveNote: () => {
    const { notes, activeNoteId } = get()
    return notes.find((n) => n.id === activeNoteId) ?? null
  },

  appendToActiveNote: (text: string) => {
    const { activeNoteId, notes } = get()
    if (!activeNoteId) return
    const note = notes.find((n) => n.id === activeNoteId)
    if (!note) return
    const newContent = note.content ? `${note.content}\n${text}` : text
    get().updateNote(activeNoteId, { content: newContent })
  },

  createNoteFromTranscription: (text: string) => {
    const title = text.slice(0, 50).trim() + (text.length > 50 ? "..." : "")
    return get().addNote({
      title,
      content: text,
      source: "transcription",
      tags: [],
    })
  },

  importNotes: (importedNotes: Note[]) => {
    set((state) => {
      const existingIds = new Set(state.notes.map((n) => n.id))
      const newNotes = importedNotes.filter((n) => !existingIds.has(n.id))
      return { notes: [...newNotes, ...state.notes] }
    })
    persistNotes(get().notes)
  },
}))

export async function hydrateNotesStore(): Promise<void> {
  try {
    const store = await getNoteStore()
    const notes = (await store.get("notes")) as Note[] | undefined
    if (notes && Array.isArray(notes)) {
      useNotesStore.setState({ notes })
    }
  } catch {
    console.warn("[notes] Failed to load persisted notes")
  }
}