/**
 * Typed re-export of Bun's built-in SQLite module.
 *
 * The data/ scripts run under Bun (see package.json scripts), which provides
 * `bun:sqlite` at runtime, but the repo does not depend on `@types/bun`. The
 * expect-error suppresses the missing-module error and the cast below gives
 * call sites a minimal, accurate surface (prepare/exec/close) instead of any.
 */

// @ts-expect-error bun:sqlite exists only in the Bun runtime
import { Database } from "bun:sqlite"

interface Statement {
  run(...params: unknown[]): unknown
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
}

type DatabaseCtor = new (
  path: string,
  options?: { readonly?: boolean; create?: boolean }
) => {
  prepare(sql: string): Statement
  query(sql: string): Statement
  exec(sql: string): void
  close(): void
}

export const SQLite = Database as unknown as DatabaseCtor
