export interface Hymn {
  id: string
  number: string
  group: string | null
  author: string | null
  composer: string | null
  firstChorusLine: string | null
  firstStanzaLine: string | null
  musicalKey: string | null
  mainCategory: string | null
  meter: string | null
  subCategory: string | null
  timeSignature: string | null
  sheetMusicLink: string | null
  stanzaCount: number
  hasChorus: boolean
}

export interface HymnStanza {
  id: number
  hymnId: string
  no: string
  text: string
  order: number | null
}

export interface HymnTune {
  hymnId: string
  label: string | null
  youtubeId: string | null
}

export interface HymnGroup {
  group: string
  count: number
}
