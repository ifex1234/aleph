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

/**
 * One-time support orders. The Bachs checkout is created by our server with a
 * server-chosen amount; the browser/app never supplies a price. `reference` is
 * sent to Bachs and is unique for the life of the account, so an order can
 * never be repointed at a second checkout. `token_hash` is the only credential
 * the desktop app keeps; the raw token is returned once at creation.
 */
export const supportOrders = pgTable(
  "support_orders",
  {
    id: bigint("id", { mode: "number" })
      .generatedByDefaultAsIdentity()
      .primaryKey(),
    reference: text("reference").notNull().unique(),
    tokenHash: text("token_hash").notNull().unique(),
    tier: text("tier").notNull(),
    amount: text("amount").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("creating"),
    checkoutId: text("checkout_id"),
    checkoutUrl: text("checkout_url"),
    checkoutStatus: text("checkout_status"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    chargeId: text("charge_id"),
    customerEmail: text("customer_email"),
    heldReason: text("held_reason"),
    lastEventId: text("last_event_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("idx_support_orders_status").on(t.status)]
);

/**
 * Durable webhook delivery log. The primary key makes recording an event and
 * applying its effect atomic when both happen in one transaction.
 */
export const bachsWebhookEvents = pgTable("bachs_webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  eventCreatedAt: timestamp("event_created_at", { withTimezone: true }),
  orderReference: text("order_reference"),
  outcome: text("outcome").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type SupportOrderRow = typeof supportOrders.$inferSelect;
export type BachsWebhookEventRow = typeof bachsWebhookEvents.$inferSelect;
