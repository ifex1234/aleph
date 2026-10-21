import { createHash, randomBytes, randomUUID } from "node:crypto";
import { amountsMatch } from "./amount";
import {
  constructWebhookEvent,
  getWebhookSecret,
  WebhookVerificationError,
} from "./bachs";
import type { BachsWebhookEvent, WebhookHeaders } from "./bachs";
import { findSupportTier } from "./catalog";
import { SupportError } from "./errors";
import type {
  CheckoutResponse,
  PublicSupportOrder,
  SupportDeps,
  SupportOrder,
} from "./types";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;
const SIGNATURE_TOLERANCE_SECONDS = 300;
const HANDLED_EVENTS = new Set(["checkout.completed", "collection.succeeded"]);

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function readToken(value: unknown): string {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) {
    throw new SupportError(400, "Invalid order token");
  }
  return value;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isExpired(order: SupportOrder): boolean {
  return (
    order.status === "pending" &&
    order.expiresAt !== null &&
    order.expiresAt.getTime() <= Date.now()
  );
}

export function toPublicOrder(order: SupportOrder): PublicSupportOrder {
  const expired = isExpired(order);
  return {
    reference: order.reference,
    tier: order.tier,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    checkout_url:
      order.status === "pending" && !expired ? order.checkoutUrl : null,
    expires_at: order.expiresAt?.toISOString() ?? null,
    paid_at: order.paidAt?.toISOString() ?? null,
    created_at: order.createdAt.toISOString(),
  };
}

function isUncertain(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as Record<string, unknown>;
  if (value.outcomeUnknown === true) return true;
  return value.errorCode === "IDEMPOTENCY_IN_PROGRESS";
}

async function createCheckout(
  order: SupportOrder,
  token: string,
  deps: SupportDeps
): Promise<CheckoutResponse> {
  let created;
  try {
    created = await deps.bachs.checkoutSessions.create(
      {
        pricing: { currency: order.currency, amount: order.amount },
        reference: order.reference,
        metadata: {
          order_reference: order.reference,
          order_tier: order.tier,
        },
      },
      { idempotencyKey: order.idempotencyKey }
    );
  } catch (error) {
    if (error instanceof SupportError) throw error;

    if (isUncertain(error)) {
      return { token, pending: true, order: toPublicOrder(order) };
    }

    console.error(
      "support: Bachs checkout creation failed:",
      error instanceof Error ? error.message : String(error)
    );
    await deps.store.markFailed(order.id, "checkout_create_failed");
    throw new SupportError(502, "Could not start the payment. Please try again.");
  }

  if (!created.checkout_id || !created.checkout_url) {
    await deps.store.markFailed(order.id, "incomplete_checkout");
    throw new SupportError(502, "Payment provider returned an incomplete checkout");
  }

  try {
    const updated = await deps.store.attachCheckout(order.id, {
      checkoutId: created.checkout_id,
      checkoutUrl: created.checkout_url,
      checkoutStatus: created.status,
      expiresAt: parseDate(created.expires_at),
    });
    return { token, pending: false, order: toPublicOrder(updated) };
  } catch (error) {
    console.error(
      "support: failed to store checkout:",
      error instanceof Error ? error.message : String(error)
    );
    return { token, pending: true, order: toPublicOrder(order) };
  }
}

export async function startSupportCheckout(
  tierKey: unknown,
  deps: SupportDeps
): Promise<CheckoutResponse> {
  const tier = findSupportTier(tierKey);
  if (!tier) {
    throw new SupportError(400, "Choose a support amount");
  }

  const token = randomBytes(32).toString("base64url");
  const reference = `sup_${randomUUID().replace(/-/g, "")}`;
  const order = await deps.store.createOrder({
    reference,
    tokenHash: hashToken(token),
    tier: tier.key,
    amount: tier.amount,
    currency: tier.currency,
    idempotencyKey: `checkout_${reference}`,
  });

  return createCheckout(order, token, deps);
}

export async function resumeSupportCheckout(
  tokenValue: unknown,
  deps: SupportDeps
): Promise<CheckoutResponse> {
  const token = readToken(tokenValue);
  const order = await deps.store.findByTokenHash(hashToken(token));
  if (!order) throw new SupportError(404, "Support order not found");

  if (order.status === "paid" || order.checkoutUrl) {
    if (isExpired(order)) {
      throw new SupportError(409, "This payment link expired. Start a new one.");
    }
    return { token, pending: false, order: toPublicOrder(order) };
  }
  if (order.status === "failed") {
    throw new SupportError(409, "This support attempt failed. Start a new one.");
  }

  return createCheckout(order, token, deps);
}

export async function getSupportOrderStatus(
  tokenValue: unknown,
  deps: SupportDeps
): Promise<PublicSupportOrder> {
  const token = readToken(tokenValue);
  const order = await deps.store.findByTokenHash(hashToken(token));
  if (!order) throw new SupportError(404, "Support order not found");
  return toPublicOrder(order);
}

function readString(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value) return value;
  }
  return null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
}

export async function processBachsWebhook(
  rawBody: string | Uint8Array,
  headers: WebhookHeaders,
  deps: SupportDeps
): Promise<WebhookResult> {
  const secret = getWebhookSecret();

  let event: BachsWebhookEvent;
  try {
    event = constructWebhookEvent(
      rawBody,
      headers,
      secret,
      SIGNATURE_TOLERANCE_SECONDS
    );
  } catch (error) {
    if (!(error instanceof WebhookVerificationError)) throw error;
    console.warn("support: rejected webhook:", error.message);
    return { status: 400, body: { error: "invalid_signature" } };
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return { status: 200, body: { received: true, ignored: true } };
  }

  const data = event.data;
  const charge = readRecord(data.charge);
  const metadata = readRecord(data.metadata);
  const checkout =
    readRecord(data.checkout) ?? readRecord(data.checkout_session);
  const reference =
    readString(data, "reference", "order_reference") ??
    (metadata ? readString(metadata, "order_reference", "reference") : null);
  const checkoutId =
    readString(data, "checkout_id", "checkoutId") ??
    (checkout ? readString(checkout, "checkout_id", "checkoutId") : null);

  const order =
    (reference ? await deps.store.findByReference(reference) : null) ??
    (checkoutId ? await deps.store.findByCheckoutId(checkoutId) : null);

  if (!order) {
    return { status: 200, body: { received: true, ignored: true } };
  }
  if (order.status === "paid") {
    return { status: 200, body: { received: true, already_paid: true } };
  }
  if (!checkoutId) {
    return { status: 200, body: { received: true, ignored: true } };
  }

  const session = await deps.bachs.checkoutSessions.get(checkoutId);
  if (session.status !== "completed") {
    return { status: 503, body: { error: "checkout_not_completed" } };
  }
  if (event.type === "checkout.completed") {
    const paymentStatus =
      session.payment_status ?? readString(data, "payment_status");
    if (paymentStatus?.toLowerCase() !== "paid") {
      return { status: 200, body: { received: true, ignored: true } };
    }
  }

  const eventCreatedAt = parseDate(event.created_at);
  const base = {
    eventId: event.id,
    eventType: event.type,
    orderReference: order.reference,
    eventCreatedAt,
    chargeId:
      readString(data, "charge_id", "collection_id") ??
      (charge ? readString(charge, "payment_id", "id") : null) ??
      session.charge_id ??
      null,
    customerEmail:
      session.customer_details?.email ?? session.customer?.email ?? null,
    checkoutStatus: session.status,
  };

  if (session.reference && session.reference !== order.reference) {
    const result = await deps.store.hold(order.id, {
      ...base,
      reason: "reference_mismatch",
    });
    return { status: 200, body: { received: true, result } };
  }

  if (
    !session.amount ||
    !session.currency ||
    session.currency.toUpperCase() !== order.currency.toUpperCase() ||
    !amountsMatch(order.amount, session.amount)
  ) {
    console.warn("support: amount mismatch for", order.reference);
    const result = await deps.store.hold(order.id, {
      ...base,
      reason: "amount_mismatch",
    });
    return { status: 200, body: { received: true, result } };
  }

  const result = await deps.store.fulfil(order.id, base);
  return { status: 200, body: { received: true, result } };
}
