import { useCallback, useEffect, useRef, useState } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  PlusIcon,
  Trash2Icon,
  FileTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SaveIcon,
  Loader,
  MenuIcon,
  ChevronDownIcon,
  DownloadIcon,
  UploadIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotesStore } from "@/stores/notes-store"

function formatDate(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function exportNotes() {
  const { notes } = useNotesStore.getState()
  const dataStr = JSON.stringify(notes, null, 2)
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
  const exportFileDefaultName = `notes-export-${new Date().toISOString().split("T")[0]}.json`
  const linkElement = document.createElement("a")
  linkElement.setAttribute("href", dataUri)
  linkElement.setAttribute("download", exportFileDefaultName)
  linkElement.click()
}

function importNotes() {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".json"
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const result = event.target?.result
        if (!result) return
        const importedNotes = JSON.parse(result as string)
        if (Array.isArray(importedNotes)) {
          useNotesStore.getState().importNotes(importedNotes)
        }
      } catch (err) {
        console.error("Failed to import notes:", err)
        alert("Invalid notes file format")
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

const handleNewNote = () => {
  useNotesStore.getState().createNoteFromTranscription("")
}

function NotesList() {
  const { notes, activeNoteId, setActiveNote, deleteNote } = useNotesStore()
  const currentId = activeNoteId

  if (notes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-sm text-muted-foreground">
        <FileTextIcon className="mb-2 size-12 opacity-50" />
        <p className="text-center">No notes yet</p>
        <p className="text-xs opacity-60">
          Notes from transcription will appear here
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-1 p-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className={cn(
              "group flex w-full items-start gap-1 rounded-lg p-1 transition-colors",
              note.id === currentId
                ? "border border-primary/20 bg-primary/10"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <button
              type="button"
              onClick={() => setActiveNote(note.id)}
              className="min-w-0 flex-1 p-1 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {note.title || "Untitled"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {note.content.slice(0, 60)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                  {formatDate(note.updatedAt)} ·{" "}
                  {note.source === "transcription" ? "🎤" : "✏️"}
                </p>
              </div>
            </button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="shrink-0"
              aria-label={`Delete ${note.title || "untitled note"}`}
              title="Delete note"
              onClick={() => deleteNote(note.id)}
            >
              <Trash2Icon className="size-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

function NoteEditor() {
  const {
    activeNoteId,
    notes,
    updateNote,
    getActiveNote,
    createNoteFromTranscription,
  } = useNotesStore()
  const note = getActiveNote()

  // Return null when no note selected - let NotesList take full height
  if (!activeNoteId) return null

  const [title, setTitle] = useState(note?.title || "")
  const [content, setContent] = useState(note?.content || "")
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync with active note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
    } else {
      setTitle("")
      setContent("")
    }
  }, [note])

  const handleSave = useCallback(() => {
    if (!activeNoteId) return
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (!trimmedTitle && !trimmedContent) return
    setIsSaving(true)
    updateNote(activeNoteId, { title: trimmedTitle, content: trimmedContent })
    setTimeout(() => {
      setIsSaving(false)
      useNotesStore.getState().setActiveNote(null)
    }, 300)
  }, [activeNoteId, title, content, updateNote])

  const handleNewNote = useCallback(() => {
    createNoteFromTranscription("")
    setTitle("")
    setContent("")
    // Focus title input after state update
    setTimeout(() => {
      const input = document.querySelector(
        "[data-note-title-input]"
      ) as HTMLInputElement
      input?.focus()
    }, 0)
  }, [createNoteFromTranscription])

  const handleDelete = useCallback(() => {
    if (!activeNoteId) return
    useNotesStore.getState().deleteNote(activeNoteId)
  }, [activeNoteId])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full flex-1 flex-col gap-2 p-3">
          <Input
            data-note-title-input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="border-none bg-transparent px-0 text-base font-medium focus:border-none focus:ring-0"
          />
          <Separator />
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing or notes from transcription will appear here..."
            className="min-h-0 flex-1 resize-none border-none bg-transparent px-0 py-2 text-sm leading-relaxed focus:border-none focus:ring-0"
            style={{ fontFamily: "inherit" }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {activeNoteId &&
            notes.find((n) => n.id === activeNoteId)?.source ===
              "transcription" && (
              <span className="flex items-center gap-1">
                🎤 From transcription
              </span>
            )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isSaving}
            className="h-8 text-destructive hover:text-destructive"
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2Icon className="size-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewNote}
            className="h-8"
          >
            <PlusIcon className="size-3.5" />
            <span className="hidden sm:inline">New</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8"
          >
            {isSaving ? (
              <Loader className="size-3.5 animate-spin" />
            ) : (
              <SaveIcon className="size-3.5" />
            )}
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function NotesPanel() {
  const { isSidebarOpen, setSidebarOpen, activeNoteId } = useNotesStore()
  const [showList, setShowList] = useState(true)

  // Always show the notes list when opening the panel from the sidebar
  useEffect(() => {
    if (isSidebarOpen) setShowList(true)
  }, [isSidebarOpen])

  return (
    <div
      data-slot="notes-panel"
      className="flex h-full w-full flex-col overflow-hidden bg-card"
    >
      <PanelHeader title="Notes" className="border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="-ml-1"
            aria-label={
              isSidebarOpen ? "Close notes panel" : "Open notes panel"
            }
          >
            {isSidebarOpen ? (
              <ChevronLeftIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowList(!showList)}
            className="ml-auto"
            aria-label={showList ? "Hide notes list" : "Show notes list"}
          >
            {showList ? (
              <MenuIcon className="size-4" />
            ) : (
              <ChevronDownIcon className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewNote}
            className="ml-auto"
            aria-label="New note"
          >
            <PlusIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={exportNotes}
            className="ml-auto"
            aria-label="Export notes"
          >
            <DownloadIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={importNotes}
            className="ml-auto"
            aria-label="Import notes"
          >
            <UploadIcon className="size-4" />
          </Button>
        </div>
      </PanelHeader>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          {showList && <NotesList />}
          {activeNoteId && (
            <>
              {showList && <Separator />}
              <NoteEditor />
            </>
          )}
          {!showList && !activeNoteId && (
            <div className="flex flex-1 items-center justify-center text-muted-foreground/50">
              <FileTextIcon className="size-8" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
