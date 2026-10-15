/**
 * Builds hymns.db from the hymnal SQL dump.
 * Run: bun run data/build-hymns-db.ts
 *
 * Source: data/hymns.sql (hymns + stanza + tune tables, ~13.7k hymns,
 * ~69.6k stanzas). Tables are imported verbatim (quoted identifiers kept),
 * minus the SEQUENCE bookkeeping table. FTS5 indexes are added for search.
 */

import { readFileSync, unlinkSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { SQLite as Database } from "./lib/sqlite"

const DATA_DIR = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(DATA_DIR, "hymns.db")
const SOURCE_PATH = join(DATA_DIR, "hymns.sql")

/**
 * Split a SQL dump into individual statements. A statement ends at a `;`
 * outside string literals (''-escaped) and quoted identifiers.
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ""
  let inString = false
  let inIdent = false

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    current += ch

    if (inString) {
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          current += sql[i + 1]
          i++
        } else {
          inString = false
        }
      }
      continue
    }

    if (inIdent) {
      if (ch === '"') inIdent = false
      continue
    }

    if (ch === "'") inString = true
    else if (ch === '"') inIdent = true
    else if (ch === ";") {
      if (current.trim() !== ";") statements.push(current)
      current = ""
    }
  }

  if (current.trim()) statements.push(current)
  return statements
}

function main() {
  console.log("\n🎼 Building hymns.db...\n")

  try {
    unlinkSync(DB_PATH)
  } catch {
    // No existing database to remove.
  }

  let raw: string
  try {
    raw = readFileSync(SOURCE_PATH, "utf-8")
  } catch {
    console.error(`\n  ❌ ${SOURCE_PATH} not found.`)
    console.error(`  The .sql file is the SOURCE — hymns.db is just its build output.`)
    console.error(`  Restore it (git checkout / backup), or regenerate it from an`)
    console.error(`  existing database with: python data/dump-hymns-db.py\n`)
    process.exit(1)
  }

  const db = new Database(DB_PATH)

  // Replay the dump statement-by-statement with a quote-aware splitter:
  // hymn text can contain raw newlines (even lines ending in ';'), so
  // naive line-based splitting corrupts multi-line INSERTs. Track string
  // (''-escaped) and identifier ("-quoted) state instead. The dump's own
  // BEGIN/COMMIT wraps the import in one txn. The SEQUENCE table is build
  // metadata — skip it.
  let executed = 0
  db.exec("PRAGMA foreign_keys=OFF;")
  for (const stmt of splitStatements(raw)) {
    const head = stmt.trimStart().toUpperCase()
    if (
      head.startsWith("CREATE TABLE SEQUENCE") ||
      head.startsWith("INSERT INTO SEQUENCE")
    ) {
      continue
    }
    try {
      db.exec(stmt)
    } catch (e) {
      console.error(`  ❌ Failed on SQL: ${stmt.substring(0, 80)}...`)
      throw e
    }
    executed++
  }
  console.log(`  ✓ Imported ${executed} statements`)

  // Extra index for group browsing (the dump already creates
  // stanza_parent_hymn and hymns_first_lines).
  console.log("  🔍 Building FTS5 search indexes...")
  db.exec("CREATE INDEX IF NOT EXISTS idx_hymns_group ON hymns(hymn_group);")
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS hymns_fts USING fts5(
    no, _id, first_stanza_line, first_chorus_line, author, composer,
    main_category, sub_category, tokenize='unicode61');`)
  db.exec(`INSERT INTO hymns_fts(rowid, no, _id, first_stanza_line, first_chorus_line, author, composer, main_category, sub_category)
    SELECT rowid, no, _id, first_stanza_line, first_chorus_line, author, composer, main_category, sub_category FROM hymns;`)
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS stanzas_fts USING fts5(text, tokenize='unicode61');`)
  db.exec(`INSERT INTO stanzas_fts(rowid, text)
    SELECT id, replace(replace(text, '<br/>', ' '), '<br>', ' ') FROM stanza;`)
  console.log("  ✓ FTS5 indexes built")

  console.log("\n  ⚡ Optimizing database...")
  db.exec("PRAGMA optimize;")
  db.exec("ANALYZE;")

  const hymnTotal = db.prepare("SELECT COUNT(*) as c FROM hymns").get() as { c: number }
  const stanzaTotal = db.prepare("SELECT COUNT(*) as c FROM stanza").get() as { c: number }
  const tuneTotal = db.prepare("SELECT COUNT(*) as c FROM tune").get() as { c: number }
  const groupRows = db.prepare("SELECT hymn_group as g, COUNT(*) as c FROM hymns GROUP BY hymn_group ORDER BY c DESC").all() as Array<{ g: string; c: number }>

  console.log(`\n✅ hymns.db built successfully!`)
  console.log(`   ${hymnTotal.c.toLocaleString()} hymns`)
  console.log(`   ${stanzaTotal.c.toLocaleString()} stanzas`)
  console.log(`   ${tuneTotal.c.toLocaleString()} tunes`)
  console.log(`   groups: ${groupRows.map((r) => `${r.g || "?"}=${r.c}`).join(", ")}`)
  console.log(`   📁 ${DB_PATH}\n`)

  db.close()
}

main()
