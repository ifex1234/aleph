import { useCallback, useEffect, useRef, useState } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader,
  MusicIcon,
  XIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useHymnStore } from "@/stores/hymn-store"
import { hymnActions } from "@/hooks/use-hymns"
import { stanzaHtmlToText, stanzaLabel } from "@/lib/hymn-content"
import type { Hymn } from "@/types"

function HymnRow({ hymn, active }: { hymn: Hymn; active: boolean }) {
  return (
    <button
      onClick={() => void hymnActions.selectHymn(hymn)}
      className={cn(
        "w-full text-left p-2 rounded-lg transition-colors",
        active
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-xs font-mono text-muted-foreground shrink-0 w-14 truncate">
          {hymn.id} · {hymn.number}
        </span>
        <p className="text-sm font-medium truncate flex-1 min-w-0">
          {hymn.firstStanzaLine ?? "Untitled"}
        </p>
      </div>
      {(hymn.author || hymn.mainCategory) && (
        <p className="text-xs text-muted-foreground truncate mt-0.5 pl-16">
          {[hymn.author, hymn.mainCategory].filter(Boolean).join(" · ")}
        </p>
      )}
    </button>
  )
}

function HymnDetail() {
  const selectedHymn = useHymnStore((s) => s.selectedHymn)
  const stanzas = useHymnStore((s) => s.stanzas)
  const tunes = useHymnStore((s) => s.tunes)
  const selectedStanzaIndex = useHymnStore((s) => s.selectedStanzaIndex)
  const loadingDetail = useHymnStore((s) => s.loadingDetail)

  const present = useCallback(
    (index: number) => {
      if (!selectedHymn || stanzas.length === 0) return
      useHymnStore.getState().selectStanza(index)
      hymnActions.presentHymnStanza(selectedHymn, stanzas, index)
    },
    [selectedHymn, stanzas]
  )

  if (!selectedHymn) return null

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => hymnActions.selectHymn(null)}
            aria-label="Back to results"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              Hymn {selectedHymn.id} · {selectedHymn.number}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {selectedHymn.firstStanzaLine ?? ""}
            </p>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5">
          {selectedHymn.author && <p>Words: {selectedHymn.author}</p>}
          {selectedHymn.composer && <p>Music: {selectedHymn.composer}</p>}
          <p>
            {[selectedHymn.musicalKey, selectedHymn.meter, selectedHymn.timeSignature]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {selectedHymn.mainCategory && (
            <p>
              {[selectedHymn.mainCategory, selectedHymn.subCategory]
                .filter(Boolean)
                .join(" — ")}
            </p>
          )}
          {tunes.length > 0 && tunes[0].youtubeId && (
            <p>
              Tune:{" "}
              <a
                href={`https://www.youtube.com/watch?v=${tunes[0].youtubeId}`}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                {tunes[0].label ?? "Listen"}
              </a>
            </p>
          )}
          {selectedHymn.sheetMusicLink && (
            <p>
              <a
                href={selectedHymn.sheetMusicLink}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                Sheet music
              </a>
            </p>
          )}
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader className="size-4 animate-spin" />
            </div>
          ) : (
            stanzas.map((stanza, i) => {
              const label = stanzaLabel(stanza.no)
              const preview = stanzaHtmlToText(stanza.text).split("\n")[0] ?? ""
              return (
                <button
                  key={stanza.id}
                  onClick={() => present(i)}
                  className={cn(
                    "w-full text-left p-2 rounded-lg transition-colors",
                    i === selectedStanzaIndex
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <p className="text-xs font-semibold text-muted-foreground">
                    {label}
                  </p>
                  <p className="text-sm leading-relaxed line-clamp-2">{preview}</p>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export function HymnsPanel() {
  const { isSidebarOpen, setSidebarOpen } = useHymnStore()
  const groups = useHymnStore((s) => s.groups)
  const activeGroup = useHymnStore((s) => s.activeGroup)
  const results = useHymnStore((s) => s.results)
  const searching = useHymnStore((s) => s.searching)
  const selectedHymn = useHymnStore((s) => s.selectedHymn)
  const [input, setInput] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load groups + initial browse when the panel first opens
  useEffect(() => {
    if (!isSidebarOpen) return
    hymnActions.loadGroups().catch(console.error)
    const state = useHymnStore.getState()
    if (state.results.length === 0) {
      hymnActions.browseHymns(state.activeGroup, 50).catch(console.error)
    }
  }, [isSidebarOpen])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const state = useHymnStore.getState()
      state.setQuery(input)
      if (input.trim()) {
        hymnActions.searchHymns(input.trim(), state.activeGroup, 25).catch(console.error)
      } else {
        hymnActions.browseHymns(state.activeGroup, 50).catch(console.error)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [input])

  const onGroupChange = useCallback(
    (value: string) => {
      const group = value === "all" ? null : value
      useHymnStore.getState().setActiveGroup(group)
      const q = useHymnStore.getState().query
      if (q.trim()) {
        hymnActions.searchHymns(q.trim(), group, 25).catch(console.error)
      } else {
        hymnActions.browseHymns(group, 50).catch(console.error)
      }
    },
    []
  )

  return (
    <div
      data-slot="hymns-panel"
      className="flex h-full w-full flex-col overflow-hidden bg-card"
    >
      <PanelHeader title="Hymns" className="border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="-ml-1"
            aria-label={isSidebarOpen ? "Close hymns panel" : "Open hymns panel"}
          >
            {isSidebarOpen ? (
              <ChevronRightIcon className="size-4" />
            ) : (
              <ChevronLeftIcon className="size-4" />
            )}
          </Button>
          {selectedHymn && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => hymnActions.selectHymn(null)}
              aria-label="Clear hymn selection"
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      </PanelHeader>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 flex-col min-w-0">
            <div className="p-2 space-y-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search number, title, first line…"
                className="h-8 text-sm"
              />
              <Select
                value={activeGroup ?? "all"}
                onValueChange={onGroupChange}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All groups</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.group} value={g.group}>
                      {g.group} ({g.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            {selectedHymn ? (
              <HymnDetail />
            ) : (
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1">
                  {searching && results.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader className="size-4 animate-spin" />
                    </div>
                  ) : results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 py-8">
                      <BookOpenIcon className="size-12 mb-2 opacity-50" />
                      <p className="text-center">No hymns found</p>
                      <p className="text-xs opacity-60">
                        Try a number, title, or first line
                      </p>
                    </div>
                  ) : (
                    results.map((hymn) => (
                      <HymnRow key={hymn.id} hymn={hymn} active={false} />
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
            {!selectedHymn && (
              <div className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                <MusicIcon className="size-3.5" />
                <span>Click a stanza to present it live</span>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
