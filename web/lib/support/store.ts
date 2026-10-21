import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bachsWebhookEvents, supportOrders } from "@/db/schema";
import type { SupportOrderRow } from "@/db/schema";
import type {
  CheckoutDetails,
  FulfilInput,
  FulfilResult,
  HoldInput,
  NewSupportOrder,
  SupportOrder,
  SupportStatus,
  SupportStore,
} from "./types";

async function database() {
  const { db, ready } = getDb();
  await ready;
  return db;
}

function toOrder(row: SupportOrderRow): SupportOrder {
  return {
    id: row.id,
    reference: row.reference,
    tokenHash: row.tokenHash,
    tier: row.tier,
    amount: row.amount,
    currency: row.currency,
    status: row.status as SupportStatus,
    checkoutId: row.checkoutId,
    checkoutUrl: row.checkoutUrl,
    checkoutStatus: row.checkoutStatus,
    expiresAt: row.expiresAt,
    idempotencyKey: row.idempotencyKey,
    chargeId: row.chargeId,
    customerEmail: row.customerEmail,
    heldReason: row.heldReason,
    lastEventId: row.lastEventId,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createPostgresSupportStore(): SupportStore {
  return {
    async createOrder(input: NewSupportOrder) {
      const db = await database();
      const [row] = await db
        .insert(supportOrders)
        .values({
          reference: input.reference,
          tokenHash: input.tokenHash,
          tier: input.tier,
          amount: input.amount,
          currency: input.currency,
          idempotencyKey: input.idempotencyKey,
        })
        .returning();
      return toOrder(row);
    },

    async findByReference(reference) {
      const db = await database();
      const [row] = await db
        .select()
        .from(supportOrders)
        .where(eq(supportOrders.reference, reference))
        .limit(1);
      return row ? toOrder(row) : null;
    },

    async findByCheckoutId(checkoutId) {
      const db = await database();
      const [row] = await db
        .select()
        .from(supportOrders)
        .where(eq(supportOrders.checkoutId, checkoutId))
        .limit(1);
      return row ? toOrder(row) : null;
    },

    async findByTokenHash(tokenHash) {
      const db = await database();
      const [row] = await db
        .select()
        .from(supportOrders)
        .where(eq(supportOrders.tokenHash, tokenHash))
        .limit(1);
      return row ? toOrder(row) : null;
    },

    async attachCheckout(orderId, details: CheckoutDetails) {
      const db = await database();
      const [row] = await db
        .update(supportOrders)
        .set({
          status: "pending",
          checkoutId: details.checkoutId,
          checkoutUrl: details.checkoutUrl,
          checkoutStatus: details.checkoutStatus,
          expiresAt: details.expiresAt,
          updatedAt: sql`now()`,
        })
        .where(eq(supportOrders.id, orderId))
        .returning();
      return toOrder(row);
    },

    async markFailed(orderId, reason) {
      const db = await database();
      await db
        .update(supportOrders)
        .set({
          status: "failed",
          heldReason: reason,
          updatedAt: sql`now()`,
        })
        .where(
          and(eq(supportOrders.id, orderId), ne(supportOrders.status, "paid"))
        );
    },

    async fulfil(orderId, input: FulfilInput): Promise<FulfilResult> {
      const db = await database();
      return db.transaction(async (tx) => {
        const inserted = await tx
          .insert(bachsWebhookEvents)
          .values({
            eventId: input.eventId,
            eventType: input.eventType,
            eventCreatedAt: input.eventCreatedAt,
            orderReference: input.orderReference,
            outcome: "paid",
          })
          .onConflictDoNothing()
          .returning({ eventId: bachsWebhookEvents.eventId });
        if (inserted.length === 0) return "duplicate";

        const updated = await tx
          .update(supportOrders)
          .set({
            status: "paid",
            chargeId: input.chargeId,
            customerEmail: input.customerEmail,
            checkoutStatus: input.checkoutStatus,
            lastEventId: input.eventId,
            heldReason: null,
            paidAt: sql`coalesce(${supportOrders.paidAt}, now())`,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(supportOrders.id, orderId),
              ne(supportOrders.status, "paid")
            )
          )
          .returning({ status: supportOrders.status });

        return updated.length ? "fulfilled" : "already-paid";
      });
    },

    async hold(orderId, input: HoldInput): Promise<FulfilResult> {
      const db = await database();
      return db.transaction(async (tx) => {
        const inserted = await tx
          .insert(bachsWebhookEvents)
          .values({
            eventId: input.eventId,
            eventType: input.eventType,
            eventCreatedAt: input.eventCreatedAt,
            orderReference: input.orderReference,
            outcome: "held",
          })
          .onConflictDoNothing()
          .returning({ eventId: bachsWebhookEvents.eventId });
        if (inserted.length === 0) return "duplicate";

        const updated = await tx
          .update(supportOrders)
          .set({
            status: "held",
            heldReason: input.reason,
            lastEventId: input.eventId,
            checkoutStatus: input.checkoutStatus,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(supportOrders.id, orderId),
              ne(supportOrders.status, "paid")
            )
          )
          .returning({ status: supportOrders.status });

        return updated.length ? "held" : "already-paid";
      });
    },
  };
}
