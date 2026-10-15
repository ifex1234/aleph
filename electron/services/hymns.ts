import Database from "better-sqlite3"
import fs from "node:fs"
import { hymnsDbPath } from "./paths"
import { error, info, warn } from "./logger"

/**
 * Read-only access to the bundled hymnal database (built by
 * `bun run data/build-hymns-db.ts` from data/hymns.sql). Opened with
 * immutable=1 so no WAL sidecars appear next to a signed bundle.
 */

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

let db: Database.Database | null = null
let openFailed = false

function conn(): Database.Database | null {
  if (db) return db
  if (openFailed) return null
  const file = hymnsDbPath()
  if (!fs.existsSync(file)) {
    warn(
      `[hymns] database not found at ${file} — run "npm run build:hymns" to build it`
    )
    openFailed = true
    return null
  }
  try {
    db = new Database(file, { readonly: true })
    db.pragma("query_only = 1")
    db.pragma("mmap_size = 134217728")
    info(`[hymns] opened ${file}`)
    return db
  } catch (e) {
    error(`[hymns] failed to open ${file}:`, e)
    openFailed = true
    return null
  }
}

function requireConn(): Database.Database | null {
  const c = conn()
  if (!c) return null
  return c
}

export function closeHymnsDb(): void {
  try {
    db?.close()
  } catch (e) {
    error("[hymns] close failed", e)
  }
  db = null
}

const HYMN_COLUMNS = `h._id AS id, h."no" AS number, h.hymn_group AS "group",
  h.author, h.composer, h.first_chorus_line AS firstChorusLine,
  h.first_stanza_line AS firstStanzaLine, h."key" AS musicalKey,
  h.main_category AS mainCategory, h.meter, h.sub_category AS subCategory,
  h."time" AS timeSignature, h.sheet_music_link AS sheetMusicLink,
  (SELECT COUNT(*) FROM stanza s WHERE s.parent_hymn = h._id AND s."no" != 'end-note') AS stanzaCount,
  (SELECT COUNT(*) FROM stanza s WHERE s.parent_hymn = h._id AND s."no" = 'chorus') AS hasChorus`

export function listHymnGroups(): HymnGroup[] {
  const c = requireConn()
  if (!c) return []
  return c
    .prepare(
      "SELECT hymn_group AS \"group\", COUNT(*) AS count FROM hymns GROUP BY hymn_group ORDER BY count DESC"
    )
    .all() as HymnGroup[]
}

function cleanFts(query: string): string {
  return query.replace(/["'()*:^]/g, " ").trim()
}

/** Browse a group (or everything) ordered by hymn number. */
export function browseHymns(group: string | null, limit: number): Hymn[] {
  const c = requireConn()
  if (!c) return []
  const where = group ? "WHERE h.hymn_group = ?" : ""
  const params: unknown[] = group ? [group, limit] : [limit]
  return c
    .prepare(
      `SELECT ${HYMN_COLUMNS} FROM hymns h ${where}
       ORDER BY CAST(h."no" AS INTEGER), h."no", h._id LIMIT ?`
    )
    .all(...params) as Hymn[]
}

export function searchHymns(
  query: string,
  group: string | null,
  limit: number
): Hymn[] {
  const c = requireConn()
  if (!c) return []
  const q = query.trim()
  if (!q) return browseHymns(group, limit)
  const cleaned = cleanFts(q)
  if (!cleaned) return browseHymns(group, limit)

  const seen = new Set<string>()
  const out: Hymn[] = []
  const push = (rows: Hymn[]) => {
    for (const r of rows) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      out.push(r)
      if (out.length >= limit) break
    }
  }

  // Tier 1: exact id / number match ("E19", "19").
  push(
    c
      .prepare(
        `SELECT ${HYMN_COLUMNS} FROM hymns h
         WHERE (h._id = ? COLLATE NOCASE OR h."no" = ?)
         ${group ? "AND h.hymn_group = ?" : ""} LIMIT ?`
      )
      .all(...(group ? [q.toUpperCase(), q, group, limit] : [q.toUpperCase(), q, limit])) as Hymn[]
  )
  if (out.length >= limit) return out

  // Tier 2: hymn-level full text (number, id, first lines, author, composer).
  if (cleaned) {
    push(
      c
        .prepare(
          `SELECT ${HYMN_COLUMNS} FROM hymns_fts fts
           JOIN hymns h ON h.rowid = fts.rowid
           WHERE hymns_fts MATCH ? ${group ? "AND h.hymn_group = ?" : ""} LIMIT ?`
        )
        .all(...(group ? [cleaned, group, limit] : [cleaned, limit])) as Hymn[]
    )
    if (out.length >= limit) return out

    // Tier 3: stanza full text mapped back to hymns.
    push(
      c
        .prepare(
          `SELECT ${HYMN_COLUMNS} FROM stanzas_fts sfts
           JOIN stanza s ON s.id = sfts.rowid
           JOIN hymns h ON h._id = s.parent_hymn
           WHERE stanzas_fts MATCH ? ${group ? "AND h.hymn_group = ?" : ""}
           GROUP BY h._id LIMIT ?`
        )
        .all(...(group ? [cleaned, group, limit] : [cleaned, limit])) as Hymn[]
    )
  }
  return out
}

export function getHymn(id: string): Hymn | null {
  const c = requireConn()
  if (!c) return null
  const row = c
    .prepare(`SELECT ${HYMN_COLUMNS} FROM hymns h WHERE h._id = ? LIMIT 1`)
    .get(id)
  return (row as Hymn | undefined) ?? null
}

export function getHymnStanzas(hymnId: string): HymnStanza[] {
  const c = requireConn()
  if (!c) return []
  return c
    .prepare(
      `SELECT id, parent_hymn AS hymnId, "no" AS no, text, n_order AS "order"
       FROM stanza WHERE parent_hymn = ? ORDER BY n_order, id`
    )
    .all(hymnId) as HymnStanza[]
}

export function getHymnTunes(hymnId: string): HymnTune[] {
  const c = requireConn()
  if (!c) return []
  return c
    .prepare(
      `SELECT _id AS hymnId, comment AS label, youtube_link AS youtubeId
       FROM tune WHERE _id = ?`
    )
    .all(hymnId) as HymnTune[]
}
