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
  ChevronLeftIcon,
  ChevronRightIcon,
  SaveIcon,
  Loader,
  MenuIcon,
  ChevronDownIcon,
  DownloadIcon,
  UploadIcon,
  MusicIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLyricsStore } from "@/stores/lyrics-store"

function formatDate(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function exportSongs() {
  const { songs } = useLyricsStore.getState()
  const dataStr = JSON.stringify(songs, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
  const exportFileDefaultName = `lyrics-export-${new Date().toISOString().split('T')[0]}.json`
  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
}

function importSongs() {
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
        const importedSongs = JSON.parse(result as string)
        if (Array.isArray(importedSongs)) {
          useLyricsStore.getState().importSongs(importedSongs)
        }
      } catch (err) {
        console.error('Failed to import songs:', err)
        alert('Invalid lyrics file format')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

const handleNewSong = () => {
  useLyricsStore.getState().addSong({
    title: "",
    artiste: "",
    lyrics: "",
  })
}

function SongsList() {
  const { songs, activeSongId, setActiveSong, deleteSong } = useLyricsStore()
  const currentId = activeSongId

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4">
        <MusicIcon className="size-12 mb-2 opacity-50" />
        <p className="text-center">No songs yet</p>
        <p className="text-xs opacity-60">Add your first song</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-2 space-y-1">
        {songs.map((song) => (
          <button
            key={song.id}
            onClick={() => setActiveSong(song.id)}
            className={cn(
              "w-full text-left p-2 rounded-lg transition-colors",
              song.id === currentId
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{song.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground truncate">{song.artiste || "Unknown artiste"}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {formatDate(song.updatedAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSong(song.id)
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

function SongEditor() {
  const { activeSongId, updateSong, getActiveSong } = useLyricsStore()
  const song = getActiveSong()
  const [title, setTitle] = useState(song?.title || "")
  const [artiste, setArtiste] = useState(song?.artiste || "")
  const [lyrics, setLyrics] = useState(song?.lyrics || "")
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Return null when no song selected - let SongsList take full height
  if (!activeSongId) return null

  // Sync with active song changes
  useEffect(() => {
    if (song) {
      setTitle(song.title)
      setArtiste(song.artiste)
      setLyrics(song.lyrics)
    } else {
      setTitle("")
      setArtiste("")
      setLyrics("")
    }
  }, [song])

  const handleSave = useCallback(() => {
    if (!activeSongId) return
    const trimmedTitle = title.trim()
    const trimmedArtiste = artiste.trim()
    const trimmedLyrics = lyrics.trim()
    if (!trimmedTitle && !trimmedArtiste && !trimmedLyrics) return
    setIsSaving(true)
    updateSong(activeSongId, { title: trimmedTitle, artiste: trimmedArtiste, lyrics: trimmedLyrics })
    setTimeout(() => {
      setIsSaving(false)
      useLyricsStore.getState().setActiveSong(null)
    }, 300)
  }, [activeSongId, title, artiste, lyrics, updateSong])

  const handleNewSong = useCallback(() => {
    useLyricsStore.getState().addSong({
      title: "",
      artiste: "",
      lyrics: "",
    })
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-full flex-1 flex flex-col p-3 gap-2">
          <div className="flex flex-col gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title..."
              className="text-base font-medium bg-transparent border-none focus:ring-0 focus:border-none px-0"
            />
            <Input
              value={artiste}
              onChange={(e) => setArtiste(e.target.value)}
              placeholder="Artiste name..."
              className="text-sm text-muted-foreground bg-transparent border-none focus:ring-0 focus:border-none px-0"
            />
          </div>
          <Separator />
          <Textarea
            ref={textareaRef}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Lyrics (blank line separates verses)..."
            className="flex-1 min-h-0 resize-none bg-transparent border-none focus:ring-0 focus:border-none px-0 py-2 text-sm leading-relaxed"
            style={{ fontFamily: "inherit", whiteSpace: "pre-wrap" }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {activeSongId && (
            <span className="flex items-center gap-1">🎵 Song</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewSong}
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

export function LyricsPanel() {
  const { isSidebarOpen, setSidebarOpen, activeSongId } = useLyricsStore()
  const [showList, setShowList] = useState(true)

  // Always show the songs list when opening the panel from the sidebar
  useEffect(() => {
    if (isSidebarOpen) setShowList(true)
  }, [isSidebarOpen])

  return (
    <div
      data-slot="lyrics-panel"
      className="flex h-full w-full flex-col overflow-hidden bg-card"
    >
      <PanelHeader title="Lyrics" className="border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="-ml-1"
            aria-label={isSidebarOpen ? "Close lyrics panel" : "Open lyrics panel"}
          >
            {isSidebarOpen ? <ChevronLeftIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowList(!showList)}
            className="ml-auto"
            aria-label={showList ? "Hide songs list" : "Show songs list"}
          >
            {showList ? <MenuIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewSong}
            className="ml-auto"
            aria-label="New song"
          >
            <PlusIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={exportSongs}
            className="ml-auto"
            aria-label="Export lyrics"
          >
            <DownloadIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={importSongs}
            className="ml-auto"
            aria-label="Import lyrics"
          >
            <UploadIcon className="size-4" />
          </Button>
        </div>
      </PanelHeader>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 flex-col min-w-0">
          {showList && <SongsList />}
          {activeSongId && (
            <>
              {showList && <Separator />}
              <SongEditor />
            </>
          )}
          {!showList && !activeSongId && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
              <MusicIcon className="size-8" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}