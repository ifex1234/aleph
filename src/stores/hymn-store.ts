import { create } from "zustand"
import type { Hymn, HymnGroup, HymnStanza, HymnTune } from "@/types"

interface HymnState {
  groups: HymnGroup[]
  activeGroup: string | null
  query: string
  results: Hymn[]
  searching: boolean
  selectedHymn: Hymn | null
  stanzas: HymnStanza[]
  tunes: HymnTune[]
  selectedStanzaIndex: number
  loadingDetail: boolean
  isSidebarOpen: boolean

  setGroups: (groups: HymnGroup[]) => void
  setActiveGroup: (group: string | null) => void
  setQuery: (query: string) => void
  setResults: (results: Hymn[]) => void
  setSearching: (searching: boolean) => void
  selectHymn: (hymn: Hymn | null) => void
  setDetail: (stanzas: HymnStanza[], tunes: HymnTune[]) => void
  setLoadingDetail: (loading: boolean) => void
  selectStanza: (index: number) => void
  setSidebarOpen: (open: boolean) => void
}

export const useHymnStore = create<HymnState>((set) => ({
  groups: [],
  activeGroup: null,
  query: "",
  results: [],
  searching: false,
  selectedHymn: null,
  stanzas: [],
  tunes: [],
  selectedStanzaIndex: 0,
  loadingDetail: false,
  isSidebarOpen: false,

  setGroups: (groups) => set({ groups }),
  setActiveGroup: (activeGroup) => set({ activeGroup }),
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setSearching: (searching) => set({ searching }),
  selectHymn: (selectedHymn) =>
    set({
      selectedHymn,
      stanzas: [],
      tunes: [],
      selectedStanzaIndex: 0,
    }),
  setDetail: (stanzas, tunes) => set({ stanzas, tunes }),
  setLoadingDetail: (loadingDetail) => set({ loadingDetail }),
  selectStanza: (selectedStanzaIndex) => set({ selectedStanzaIndex }),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
}))
