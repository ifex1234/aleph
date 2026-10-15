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
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
  const exportFileDefaultName = `notes-export-${new Date().toISOString().split('T')[0]}.json`
  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
}

function importNotes() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
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
        console.error('Failed to import notes:', err)
        alert('Invalid notes file format')
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4">
        <FileTextIcon className="size-12 mb-2 opacity-50" />
        <p className="text-center">No notes yet</p>
        <p className="text-xs opacity-60">Notes from transcription will appear here</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-2 space-y-1">
        {notes.map((note) => (
          <button
            key={note.id}
            onClick={() => setActiveNote(note.id)}
            className={cn(
              "w-full text-left p-2 rounded-lg transition-colors",
              note.id === currentId
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{note.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground truncate">{note.content.slice(0, 60)}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {formatDate(note.updatedAt)} · {note.source === "transcription" ? "🎤" : "✏️"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteNote(note.id)
                }}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}

function NoteEditor() {
  const { activeNoteId, notes, updateNote, getActiveNote, createNoteFromTranscription } = useNotesStore()
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
      const input = document.querySelector('[data-note-title-input]') as HTMLInputElement
      input?.focus()
    }, 0)
  }, [createNoteFromTranscription])

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-full flex-1 flex flex-col p-3 gap-2">
          <Input
            data-note-title-input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-base font-medium bg-transparent border-none focus:ring-0 focus:border-none px-0"
          />
          <Separator />
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing or notes from transcription will appear here..."
            className="flex-1 min-h-0 resize-none bg-transparent border-none focus:ring-0 focus:border-none px-0 py-2 text-sm leading-relaxed"
            style={{ fontFamily: "inherit" }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {activeNoteId && notes.find((n) => n.id === activeNoteId)?.source === "transcription" && (
            <span className="flex items-center gap-1">🎤 From transcription</span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
            {isSaving ? <Loader className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
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
            aria-label={isSidebarOpen ? "Close notes panel" : "Open notes panel"}
          >
            {isSidebarOpen ? <ChevronLeftIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowList(!showList)}
            className="ml-auto"
            aria-label={showList ? "Hide notes list" : "Show notes list"}
          >
            {showList ? <MenuIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
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

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 flex-col min-w-0">
          {showList && <NotesList />}
          {activeNoteId && (
            <>
              {showList && <Separator />}
              <NoteEditor />
            </>
          )}
          {!showList && !activeNoteId && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
              <FileTextIcon className="size-8" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}