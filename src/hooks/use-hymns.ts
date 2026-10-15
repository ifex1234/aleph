import { invoke } from "@tauri-apps/api/core"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { useHymnStore } from "@/stores/hymn-store"
import { stanzasToLyricVerses } from "@/lib/hymn-content"
import type { Hymn, HymnGroup, HymnStanza, HymnTune } from "@/types"

async function loadGroups() {
  const groups = await invoke<HymnGroup[]>("list_hymn_groups")
  useHymnStore.getState().setGroups(groups)
  return groups
}

async function searchHymns(query: string, group: string | null, limit = 25) {
  const state = useHymnStore.getState()
  state.setSearching(true)
  try {
    const results = await invoke<Hymn[]>("search_hymns", {
      query,
      group: group ?? "",
      limit,
    })
    state.setResults(results)
    return results
  } finally {
    state.setSearching(false)
  }
}

async function browseHymns(group: string | null, limit = 50) {
  const state = useHymnStore.getState()
  state.setSearching(true)
  try {
    const results = await invoke<Hymn[]>("browse_hymns", {
      group: group ?? "",
      limit,
    })
    state.setResults(results)
    return results
  } finally {
    state.setSearching(false)
  }
}

async function loadHymnDetail(id: string) {
  const state = useHymnStore.getState()
  state.setLoadingDetail(true)
  try {
    const [stanzas, tunes] = await Promise.all([
      invoke<HymnStanza[]>("get_hymn_stanzas", { id }),
      invoke<HymnTune[]>("get_hymn_tunes", { id }),
    ])
    state.setDetail(stanzas, tunes)
    return { stanzas, tunes }
  } finally {
    state.setLoadingDetail(false)
  }
}

async function selectHymn(hymn: Hymn | null) {
  useHymnStore.getState().selectHymn(hymn)
  if (hymn) await loadHymnDetail(hymn.id)
}

/**
 * Present a hymn stanza to the live output via the lyrics-slide pipeline
 * (one slide, verse navigation like Cloud of Worship songs).
 */
function presentHymnStanza(hymn: Hymn, stanzas: HymnStanza[], index: number) {
  const verses = stanzasToLyricVerses(stanzas)
  if (verses.length === 0) return
  const safeIndex = Math.min(Math.max(0, index), verses.length - 1)
  const byline = [hymn.author, hymn.composer].filter(Boolean).join(" / ") || undefined
  const broadcast = useBroadcastStore.getState()
  broadcast.setLyricsSlideContent({
    verses,
    currentVerseIndex: safeIndex,
    title: `Hymn ${hymn.id}`,
    author: byline,
  })
  broadcast.setLyricsSource("hymn")
  broadcast.setActiveContentType("lyrics")
  useHymnStore.getState().selectStanza(safeIndex)
}

export const hymnActions = {
  loadGroups,
  searchHymns,
  browseHymns,
  loadHymnDetail,
  selectHymn,
  presentHymnStanza,
}

export function useHymns() {
  const groups = useHymnStore((s) => s.groups)
  const activeGroup = useHymnStore((s) => s.activeGroup)
  const query = useHymnStore((s) => s.query)
  const results = useHymnStore((s) => s.results)
  const searching = useHymnStore((s) => s.searching)
  const selectedHymn = useHymnStore((s) => s.selectedHymn)
  const stanzas = useHymnStore((s) => s.stanzas)
  const tunes = useHymnStore((s) => s.tunes)
  const selectedStanzaIndex = useHymnStore((s) => s.selectedStanzaIndex)
  const loadingDetail = useHymnStore((s) => s.loadingDetail)

  return {
    groups,
    activeGroup,
    query,
    results,
    searching,
    selectedHymn,
    stanzas,
    tunes,
    selectedStanzaIndex,
    loadingDetail,
    ...hymnActions,
  }
}
