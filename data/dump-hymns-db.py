"""
Regenerate data/hymns.sql from data/hymns.db.

The .sql file is the SOURCE; hymns.db is a build artifact produced by
`bun run data/build-hymns-db.ts`. If hymns.sql is ever lost, run:

    python data/dump-hymns-db.py

Only the source tables (hymns, stanza, tune) plus the view/indexes from
the original dump are emitted — FTS5 shadow tables and SQLite internals
are skipped (build-hymns-db.ts recreates them).

Run: python data/dump-hymns-db.py
"""

import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent
DB_PATH = DATA_DIR / "hymns.db"
OUT_PATH = DATA_DIR / "hymns.sql"
# Source tables in dependency order. Everything else (FTS5 tables, their
# shadow/index tables, sqlite_stat1) is a build artifact.
TABLES = ("hymns", "stanza", "tune")


def sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    return "'" + str(value).replace("'", "''") + "'"


def main():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row

    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write("PRAGMA foreign_keys=OFF;\n")
        f.write("BEGIN TRANSACTION;\n")

        for table in TABLES:
            schema = con.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
                (table,),
            ).fetchone()
            if not schema:
                raise SystemExit(f"table {table!r} missing from {DB_PATH}")
            f.write(schema["sql"] + ";\n")

            cols = [r["name"] for r in con.execute(f'PRAGMA table_info("{table}")')]
            col_list = ", ".join(f'"{c}"' for c in cols)
            for row in con.execute(f'SELECT {col_list} FROM "{table}"'):
                vals = ", ".join(sql_literal(row[c]) for c in cols)
                f.write(f"INSERT INTO {table} VALUES({vals});\n")

        # View + helpful indexes from the original dump (skip FTS/internal).
        for row in con.execute(
            """SELECT type, name, sql FROM sqlite_master
               WHERE sql IS NOT NULL AND type IN ('view', 'index')
               AND name NOT LIKE 'sqlite_%'
               AND name NOT LIKE 'hymns_fts%'
               AND name NOT LIKE 'stanzas_fts%'
               ORDER BY type, name"""
        ):
            f.write(row["sql"] + ";\n")

        f.write("COMMIT;\n")

    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
