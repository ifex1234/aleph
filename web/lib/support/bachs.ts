import { createHmac, timingSafeEqual } from "node:crypto";
import { SupportError } from "./errors";
import type {
  BachsCheckout,
  BachsCheckoutCreated,
  BachsClientLike,
} from "./types";

const SANDBOX_URL = "https://sandbox-api.bachs.io";
const PRODUCTION_URL = "https://api.bachs.io";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300;

export type WebhookHeaders =
  | Headers
  | Record<string, string | string[] | undefined>;

export interface BachsWebhookEvent {
  id: string;
  type: string;
  created_at: string;
  organization_id: string;
  data: Record<string, unknown>;
  [key: string]: unknown;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

class BachsRequestError extends Error {
  readonly status: number | null;
  readonly errorCode: string | undefined;
  readonly outcomeUnknown: boolean;

  constructor(
    message: string,
    options: {
      status: number | null;
      errorCode: string | undefined;
      outcomeUnknown: boolean;
    }
  ) {
    super(message);
    this.name = "BachsRequestError";
    this.status = options.status;
    this.errorCode = options.errorCode;
    this.outcomeUnknown = options.outcomeUnknown;
  }
}

function credentials() {
  const apiKey = process.env.BACHS_API_KEY?.trim();
  if (!apiKey) {
    throw new SupportError(503, "Online support is not configured");
  }

  const environment = apiKey.startsWith("sk_live_") ? "production" : "sandbox";
  const declared = process.env.BACHS_ENVIRONMENT?.trim();
  if (declared && declared !== environment) {
    throw new SupportError(
      503,
      "BACHS_ENVIRONMENT does not match the configured API key"
    );
  }

  return {
    apiKey,
    baseUrl: environment === "production" ? PRODUCTION_URL : SANDBOX_URL,
  };
}

export function getWebhookSecret(): string {
  const secret = process.env.BACHS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new SupportError(503, "Bachs webhook is not configured");
  }
  return secret;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function decodeCreated(value: unknown): BachsCheckoutCreated {
  const body = asRecord(value);
  if (
    !body ||
    !isString(body.checkout_id) ||
    !isString(body.checkout_url) ||
    !isString(body.status) ||
    !isString(body.expires_at) ||
    !isString(body.created_at)
  ) {
    throw new Error("Unexpected Bachs checkout creation response");
  }
  return {
    checkout_id: body.checkout_id,
    checkout_url: body.checkout_url,
    status: body.status,
    expires_at: body.expires_at,
    created_at: body.created_at,
    reference: isString(body.reference) ? body.reference : null,
  };
}

function decodeIdentity(value: unknown): { email?: string | null } | null {
  const body = asRecord(value);
  if (!body) return null;
  return { email: isString(body.email) ? body.email : null };
}

function decodeCheckout(value: unknown): BachsCheckout {
  const body = asRecord(value);
  if (!body || !isString(body.checkout_id) || !isString(body.status)) {
    throw new Error("Unexpected Bachs checkout response");
  }
  const charge = asRecord(body.charge);
  return {
    checkout_id: body.checkout_id,
    status: body.status,
    amount: isString(body.amount) ? body.amount : undefined,
    currency: isString(body.currency) ? body.currency : undefined,
    reference: isString(body.reference) ? body.reference : null,
    payment_status: isString(body.payment_status) ? body.payment_status : undefined,
    customer: decodeIdentity(body.customer),
    customer_details: decodeIdentity(body.customer_details),
    charge_id: charge && isString(charge.payment_id) ? charge.payment_id : null,
  };
}

async function request(
  method: "GET" | "POST",
  path: string,
  options: { body?: unknown; idempotencyKey?: string } = {}
): Promise<unknown> {
  const { apiKey, baseUrl } = credentials();
  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  });
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }

  let response: Response;
  let text: string;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: "manual",
    });
    text = await response.text();
  } catch {
    throw new BachsRequestError("Could not reach Bachs", {
      status: null,
      errorCode: undefined,
      outcomeUnknown: method !== "GET",
    });
  }

  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    const body = asRecord(parsed);
    throw new BachsRequestError(
      `Bachs request failed with HTTP ${response.status}`,
      {
        status: response.status,
        errorCode:
          body && isString(body.error_code)
            ? body.error_code
            : body && isString(body.code)
              ? body.code
              : undefined,
        outcomeUnknown: method !== "GET" && response.status >= 500,
      }
    );
  }

  return parsed;
}

export function getBachsClient(): BachsClientLike {
  return {
    checkoutSessions: {
      async create(input, options) {
        // The published SDK's ESM build is missing its compiled modules, so
        // call the documented REST endpoints directly instead.
        return decodeCreated(
          await request("POST", "/v1/checkout-sessions", {
            body: input,
            idempotencyKey: options?.idempotencyKey,
          })
        );
      },
      async get(checkoutId) {
        if (!checkoutId) throw new Error("A checkout id is required");
        return decodeCheckout(
          await request(
            "GET",
            `/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`
          )
        );
      },
    },
  };
}

function readHeader(headers: WebhookHeaders, name: string): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }
  const entries = Object.entries(headers).filter(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  );
  if (entries.length > 1) {
    throw new WebhookVerificationError("Duplicate webhook header");
  }
  const value = entries[0]?.[1];
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new WebhookVerificationError("Duplicate webhook header");
    }
    return value[0];
  }
  return value;
}

function decodeEvent(value: unknown): BachsWebhookEvent {
  const body = asRecord(value);
  const data = body ? asRecord(body.data) : null;
  if (
    !body ||
    !data ||
    !isString(body.id) ||
    !body.id ||
    !isString(body.type) ||
    !body.type ||
    !isString(body.created_at) ||
    !body.created_at ||
    !isString(body.organization_id) ||
    !body.organization_id
  ) {
    throw new WebhookVerificationError(
      "Verified webhook body is not a supported event envelope"
    );
  }
  return {
    ...body,
    id: body.id,
    type: body.type,
    created_at: body.created_at,
    organization_id: body.organization_id,
    data,
  };
}

export function constructWebhookEvent(
  rawBody: string | Uint8Array,
  headers: WebhookHeaders,
  secret: string,
  toleranceSeconds = DEFAULT_SIGNATURE_TOLERANCE_SECONDS
): BachsWebhookEvent {
  if (!secret) {
    throw new WebhookVerificationError("Webhook signing secret is required");
  }

  const bytes =
    typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : Buffer.from(rawBody);
  const v2 = readHeader(headers, "X-Bachs-Signature-V2");

  let timestamp: string | undefined;
  let signatures: string[];
  if (v2 !== undefined) {
    const fields = v2.split(",").map((part) => part.trim());
    const timestamps = fields.filter((part) => part.startsWith("t="));
    if (timestamps.length !== 1) {
      throw new WebhookVerificationError(
        "Webhook signature must contain one timestamp"
      );
    }
    timestamp = timestamps[0].slice(2);
    signatures = fields
      .filter((part) => part.startsWith("v1="))
      .map((part) => part.slice(3));
  } else {
    timestamp = readHeader(headers, "X-Bachs-Timestamp");
    const signature = readHeader(headers, "X-Bachs-Signature");
    signatures = signature === undefined ? [] : [signature];
  }

  if (
    timestamp === undefined ||
    !/^\d+$/.test(timestamp) ||
    !Number.isSafeInteger(Number(timestamp))
  ) {
    throw new WebhookVerificationError("Webhook timestamp is missing or invalid");
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds) {
    throw new WebhookVerificationError(
      "Webhook timestamp is outside the permitted tolerance"
    );
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`, "utf8")
    .update(bytes)
    .digest();
  const verified = signatures.some(
    (signature) =>
      /^[a-fA-F0-9]{64}$/.test(signature) &&
      timingSafeEqual(expected, Buffer.from(signature, "hex"))
  );
  if (!verified) {
    throw new WebhookVerificationError("Webhook signature does not match");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new WebhookVerificationError(
      "Verified webhook body is not valid UTF-8 JSON"
    );
  }
  return decodeEvent(parsed);
}
