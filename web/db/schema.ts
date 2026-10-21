import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Aleph analytics event log (own database, separate from any other app).
 *
 * `dedupe_key` enforces server-side dedupe:
 *   - visit:    `visit:<yyyymmddhh>:<anon_id>`  (1 per visitor per UTC hour)
 *   - download: `download:<platform>:<anon_id>` (1 per device per platform)
 *   - game_play: no dedupe (NULL)
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigint("id", { mode: "number" })
      .generatedByDefaultAsIdentity()
      .primaryKey(),
    eventType: text("event_type").notNull(),
    anonId: text("anon_id"),
    platform: text("platform"),
    dedupeKey: text("dedupe_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_analytics_events_type_created").on(t.eventType, t.createdAt),
    index("idx_analytics_events_platform").on(t.platform, t.eventType),
  ]
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
