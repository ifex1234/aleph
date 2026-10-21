import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { SupportError } from "./errors";
import {
  getSupportOrderStatus,
  processBachsWebhook,
  resumeSupportCheckout,
  startSupportCheckout,
} from "./service";
import type {
  BachsCheckout,
  BachsCheckoutCreateInput,
  BachsCheckoutCreated,
  CheckoutDetails,
  FulfilInput,
  FulfilResult,
  HoldInput,
  NewSupportOrder,
  SupportDeps,
  SupportOrder,
  SupportStatus,
  SupportStore,
} from "./types";

const SECRET = "whsec_test";

class MemoryStore implements SupportStore {
  orders = new Map<number, SupportOrder>();
  events = new Set<string>();
  failNextFulfil = false;
  private nextId = 1;

  async createOrder(input: NewSupportOrder): Promise<SupportOrder> {
    const now = new Date();
    const order: SupportOrder = {
      id: this.nextId++,
      ...input,
      status: "creating",
      checkoutId: null,
      checkoutUrl: null,
      checkoutStatus: null,
      expiresAt: null,
      chargeId: null,
      customerEmail: null,
      heldReason: null,
      lastEventId: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(order.id, order);
    return order;
  }

  private find(predicate: (order: SupportOrder) => boolean) {
    return [...this.orders.values()].find(predicate) ?? null;
  }

  async findByReference(reference: string) {
    return this.find((order) => order.reference === reference);
  }

  async findByCheckoutId(checkoutId: string) {
    return this.find((order) => order.checkoutId === checkoutId);
  }

  async findByTokenHash(tokenHash: string) {
    return this.find((order) => order.tokenHash === tokenHash);
  }

  async attachCheckout(orderId: number, details: CheckoutDetails) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("missing order");
    order.status = "pending";
    order.checkoutId = details.checkoutId;
    order.checkoutUrl = details.checkoutUrl;
    order.checkoutStatus = details.checkoutStatus;
    order.expiresAt = details.expiresAt;
    return order;
  }

  async markFailed(orderId: number, reason: string) {
    const order = this.orders.get(orderId);
    if (!order || order.status === "paid") return;
    order.status = "failed";
    order.heldReason = reason;
  }

  async fulfil(orderId: number, input: FulfilInput): Promise<FulfilResult> {
    if (this.failNextFulfil) {
      this.failNextFulfil = false;
      throw new Error("database unavailable");
    }
    if (this.events.has(input.eventId)) return "duplicate";
    const order = this.orders.get(orderId);
    if (!order) throw new Error("missing order");
    this.events.add(input.eventId);
    order.lastEventId = input.eventId;
    if (order.status === "paid") return "already-paid";
    order.status = "paid";
    order.paidAt = new Date();
    order.chargeId = input.chargeId;
    order.customerEmail = input.customerEmail;
    return "fulfilled";
  }

  async hold(orderId: number, input: HoldInput): Promise<FulfilResult> {
    if (this.events.has(input.eventId)) return "duplicate";
    const order = this.orders.get(orderId);
    if (!order) throw new Error("missing order");
    this.events.add(input.eventId);
    order.lastEventId = input.eventId;
    if (order.status === "paid") return "already-paid";
    order.status = "held";
    order.heldReason = input.reason;
    return "held";
  }

  setStatus(orderId: number, status: SupportStatus) {
    const order = this.orders.get(orderId);
    if (order) order.status = status;
  }
}

class FakeBachs {
  creates: Array<{ input: BachsCheckoutCreateInput; key?: string }> = [];
  sessions = new Map<string, BachsCheckout>();
  failNextUnknown = false;
  nextError: unknown = null;
  private created = new Map<string, BachsCheckoutCreated>();
  private nextId = 1;

  client = {
    checkoutSessions: {
      create: async (
        input: BachsCheckoutCreateInput,
        options?: { idempotencyKey?: string }
      ) => {
        this.creates.push({ input, key: options?.idempotencyKey });
        if (this.nextError) {
          const error = this.nextError;
          this.nextError = null;
          throw error;
        }
        if (this.failNextUnknown) {
          this.failNextUnknown = false;
          throw Object.assign(new Error("timeout"), { outcomeUnknown: true });
        }
        const cached = options?.idempotencyKey
          ? this.created.get(options.idempotencyKey)
          : undefined;
        if (cached) return cached;
        const id = `chk_${this.nextId++}`;
        const value: BachsCheckoutCreated = {
          checkout_id: id,
          checkout_url: `https://checkout.bachs.io/${id}`,
          status: "open",
          expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
          created_at: new Date().toISOString(),
          reference: input.reference,
        };
        if (options?.idempotencyKey) {
          this.created.set(options.idempotencyKey, value);
        }
        this.sessions.set(id, {
          checkout_id: id,
          status: "open",
          amount: input.pricing.amount,
          currency: input.pricing.currency,
          reference: input.reference,
        });
        return value;
      },
      get: async (checkoutId: string) => {
        const session = this.sessions.get(checkoutId);
        if (!session) throw new Error("missing session");
        return session;
      },
    },
  };
}

let store: MemoryStore;
let bachs: FakeBachs;
let deps: SupportDeps;
let originalSecret: string | undefined;

beforeAll(() => {
  originalSecret = process.env.BACHS_WEBHOOK_SECRET;
  process.env.BACHS_WEBHOOK_SECRET = SECRET;
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.BACHS_WEBHOOK_SECRET;
  else process.env.BACHS_WEBHOOK_SECRET = originalSecret;
});

beforeEach(() => {
  store = new MemoryStore();
  bachs = new FakeBachs();
  deps = { store, bachs: bachs.client };
});

function sign(payload: unknown, secret = SECRET) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return {
    body,
    headers: new Headers({
      "x-bachs-signature-v2": `t=${timestamp},v1=${signature}`,
    }),
  };
}

function webhookEvent(
  reference: string,
  checkoutId: string,
  id = "evt_1"
) {
  return {
    id,
    type: "checkout.completed",
    created_at: new Date().toISOString(),
    organization_id: "org_test",
    data: { checkout_id: checkoutId, reference },
  };
}

async function start() {
  return startSupportCheckout("small", deps);
}

async function pendingOrder() {
  const result = await start();
  const order = [...store.orders.values()][0];
  return { result, order };
}

describe("startSupportCheckout", () => {
  test("uses the server catalog price and an idempotency key", async () => {
    const result = await startSupportCheckout("regular", deps);

    expect(result.order.amount).toBe("5000.00");
    expect(result.order.currency).toBe("NGN");
    expect(result.order.status).toBe("pending");
    expect(result.order.checkout_url).toBeString();
    expect(bachs.creates).toHaveLength(1);
    expect(bachs.creates[0].input.pricing).toEqual({
      currency: "NGN",
      amount: "5000.00",
    });
    expect(bachs.creates[0].key).toBe(`checkout_${result.order.reference}`);
  });

  test("rejects unknown tiers without creating an order", async () => {
    await expect(startSupportCheckout("free", deps)).rejects.toBeInstanceOf(
      SupportError
    );
    expect(store.orders.size).toBe(0);
    expect(bachs.creates).toHaveLength(0);
  });

  test("keeps the order resumable when the provider outcome is unknown", async () => {
    bachs.failNextUnknown = true;
    const result = await startSupportCheckout("small", deps);

    expect(result.pending).toBe(true);
    expect(result.order.status).toBe("creating");
    expect(result.order.checkout_url).toBeNull();

    const resumed = await resumeSupportCheckout(result.token, deps);
    expect(resumed.pending).toBe(false);
    expect(resumed.order.checkout_url).toBeString();
    expect(bachs.creates).toHaveLength(2);
    expect(bachs.creates[1].key).toBe(bachs.creates[0].key);
  });

  test("waits when the same key is still in progress", async () => {
    bachs.nextError = Object.assign(new Error("in progress"), {
      status: 409,
      errorCode: "IDEMPOTENCY_IN_PROGRESS",
    });

    const result = await startSupportCheckout("small", deps);
    expect(result.pending).toBe(true);
    expect(result.order.status).toBe("creating");
  });
});

describe("status and resume", () => {
  test("status is scoped to the token and never changes state", async () => {
    const { result } = await pendingOrder();

    const status = await getSupportOrderStatus(result.token, deps);
    expect(status.status).toBe("pending");
    expect([...store.orders.values()][0].status).toBe("pending");

    await expect(getSupportOrderStatus("x".repeat(43), deps)).rejects.toThrow(
      "not found"
    );
  });

  test("resume returns the existing checkout instead of creating another", async () => {
    const { result } = await pendingOrder();

    const resumed = await resumeSupportCheckout(result.token, deps);
    expect(resumed.order.checkout_url).toBe(result.order.checkout_url);
    expect(bachs.creates).toHaveLength(1);
  });

  test("refuses to resume an expired checkout", async () => {
    const { result, order } = await pendingOrder();
    order.expiresAt = new Date(Date.now() - 1000);

    await expect(resumeSupportCheckout(result.token, deps)).rejects.toThrow(
      /expired/i
    );
  });
});

describe("webhook", () => {
  test("fulfils a paid checkout and records the charge", async () => {
    const { result, order } = await pendingOrder();
    bachs.sessions.set("chk_1", {
      checkout_id: "chk_1",
      status: "completed",
      payment_status: "paid",
      amount: "2000.00",
      currency: "NGN",
      reference: order.reference,
      customer_details: { email: "supporter@example.com" },
      charge_id: "pay_123",
    });

    const event = sign(webhookEvent(order.reference, "chk_1"));
    const resultOne = await processBachsWebhook(event.body, event.headers, deps);

    expect(resultOne.status).toBe(200);
    expect(order.status).toBe("paid");
    expect(order.chargeId).toBe("pay_123");
    expect(order.customerEmail).toBe("supporter@example.com");

    const status = await getSupportOrderStatus(result.token, deps);
    expect(status.status).toBe("paid");
    expect(status.paid_at).toBeString();
    expect(status.checkout_url).toBeNull();
  });

  test("is idempotent across duplicate deliveries", async () => {
    const { order } = await pendingOrder();
    bachs.sessions.set("chk_1", {
      checkout_id: "chk_1",
      status: "completed",
      payment_status: "paid",
      amount: "2000.00",
      currency: "NGN",
      reference: order.reference,
    });

    const first = sign(webhookEvent(order.reference, "chk_1", "evt_1"));
    const second = sign(webhookEvent(order.reference, "chk_1", "evt_2"));

    expect((await processBachsWebhook(first.body, first.headers, deps)).status).toBe(200);
    expect((await processBachsWebhook(second.body, second.headers, deps)).status).toBe(200);
    expect(order.status).toBe("paid");
    expect(store.events.size).toBe(1);
  });

  test("rejects a bad signature before touching any state", async () => {
    const { order } = await pendingOrder();
    const event = sign(webhookEvent(order.reference, "chk_1"), "wrong_secret");

    const res = await processBachsWebhook(event.body, event.headers, deps);
    expect(res.status).toBe(400);
    expect(order.status).toBe("pending");
  });

  test("holds instead of fulfilling when the amount differs", async () => {
    const { order } = await pendingOrder();
    bachs.sessions.set("chk_1", {
      checkout_id: "chk_1",
      status: "completed",
      payment_status: "paid",
      amount: "100.00",
      currency: "NGN",
      reference: order.reference,
    });

    const event = sign(webhookEvent(order.reference, "chk_1"));
    const res = await processBachsWebhook(event.body, event.headers, deps);

    expect(res.status).toBe(200);
    expect(order.status).toBe("held");
    expect(order.heldReason).toBe("amount_mismatch");
    expect(order.paidAt).toBeNull();
  });

  test("asks Bachs to retry while the checkout is not completed", async () => {
    const { order } = await pendingOrder();
    bachs.sessions.set("chk_1", {
      checkout_id: "chk_1",
      status: "open",
      amount: "2000.00",
      currency: "NGN",
      reference: order.reference,
    });

    const event = sign(webhookEvent(order.reference, "chk_1"));
    const res = await processBachsWebhook(event.body, event.headers, deps);

    expect(res.status).toBe(503);
    expect(order.status).toBe("pending");
  });

  test("ignores a completed checkout that has not been paid", async () => {
    const { order } = await pendingOrder();
    bachs.sessions.set("chk_1", {
      checkout_id: "chk_1",
      status: "completed",
      payment_status: "unpaid",
      amount: "2000.00",
      currency: "NGN",
      reference: order.reference,
    });

    const event = sign(webhookEvent(order.reference, "chk_1"));
    const res = await processBachsWebhook(event.body, event.headers, deps);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ignored: true });
    expect(order.status).toBe("pending");
  });

  test("redelivery succeeds after a storage failure", async () => {
    const { order } = await pendingOrder();
    bachs.sessions.set("chk_1", {
      checkout_id: "chk_1",
      status: "completed",
      payment_status: "paid",
      amount: "2000.00",
      currency: "NGN",
      reference: order.reference,
    });
    store.failNextFulfil = true;

    const event = sign(webhookEvent(order.reference, "chk_1"));
    await expect(
      processBachsWebhook(event.body, event.headers, deps)
    ).rejects.toThrow("database unavailable");
    expect(order.status).toBe("pending");

    const retry = sign(webhookEvent(order.reference, "chk_1", "evt_1"));
    const res = await processBachsWebhook(retry.body, retry.headers, deps);
    expect(res.status).toBe(200);
    expect(order.status).toBe("paid");
  });

  test("ignores unrelated events and unknown orders", async () => {
    const { order } = await pendingOrder();
    const unrelated = sign({
      ...webhookEvent(order.reference, "chk_1"),
      type: "payment.failed",
    });
    const unknown = sign(webhookEvent("sup_unknown", "chk_unknown"));

    expect(
      (await processBachsWebhook(unrelated.body, unrelated.headers, deps)).status
    ).toBe(200);
    expect(
      (await processBachsWebhook(unknown.body, unknown.headers, deps)).status
    ).toBe(200);
    expect(order.status).toBe("pending");
  });
});
