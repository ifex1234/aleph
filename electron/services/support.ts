import { app, shell } from "electron"

const DEV_API_URL = "http://localhost:3030"
const PRODUCTION_API_URL = "https://aleph.zeravest.com"
const REQUEST_TIMEOUT_MS = 20_000
const SETTLE_DELAY_MS = 1_500

export interface SupportOrderSummary {
  reference: string
  tier: string
  amount: string
  currency: string
  status: "creating" | "pending" | "paid" | "held" | "failed"
  checkout_url: string | null
  expires_at: string | null
  paid_at: string | null
  created_at: string
}

export interface SupportCheckoutResult {
  token: string
  pending: boolean
  order: SupportOrderSummary
}

function apiBaseUrl(): string {
  const configured = process.env.ALEPH_SUPPORT_API_URL?.trim()
  if (configured) return configured.replace(/\/+$/, "")
  return app.isPackaged ? PRODUCTION_API_URL : DEV_API_URL
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

async function post(path: string, body: unknown): Promise<unknown> {
  let response: Response
  let text: string
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    text = await response.text()
  } catch {
    throw new Error("Could not reach the support server. Check your connection.")
  }

  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }

  if (!response.ok) {
    const payload = asRecord(parsed)
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : `Support server error (HTTP ${response.status})`
    )
  }
  return parsed
}

function decodeCheckout(value: unknown): SupportCheckoutResult {
  const body = asRecord(value)
  const order = body ? asRecord(body.order) : null
  if (
    !body ||
    typeof body.token !== "string" ||
    !order ||
    typeof order.reference !== "string" ||
    typeof order.amount !== "string" ||
    typeof order.currency !== "string" ||
    typeof order.status !== "string"
  ) {
    throw new Error("Unexpected response from the support server.")
  }
  return {
    token: body.token,
    pending: body.pending === true,
    order: order as unknown as SupportOrderSummary,
  }
}

function decodeOrder(value: unknown): SupportOrderSummary {
  const body = asRecord(value)
  const order = body ? asRecord(body.order) : null
  if (!order || typeof order.reference !== "string" || typeof order.status !== "string") {
    throw new Error("Unexpected response from the support server.")
  }
  return order as unknown as SupportOrderSummary
}

async function openCheckout(raw: string): Promise<void> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error("The payment link was invalid.")
  }
  const host = url.hostname.toLowerCase()
  if (
    url.protocol !== "https:" ||
    !(host === "bachs.io" || host.endsWith(".bachs.io"))
  ) {
    throw new Error("The payment link was not a Bachs address.")
  }
  await shell.openExternal(url.toString())
}

async function settle(result: SupportCheckoutResult): Promise<SupportCheckoutResult> {
  if (result.order.checkout_url) {
    await openCheckout(result.order.checkout_url).catch(() => undefined)
    return result
  }
  if (!result.pending) return result

  await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY_MS))
  try {
    const resumed = decodeCheckout(
      await post("/api/support/resume", { token: result.token })
    )
    if (resumed.order.checkout_url) {
      await openCheckout(resumed.order.checkout_url).catch(() => undefined)
    }
    return resumed
  } catch {
    return result
  }
}

export async function createCheckout(tier: string): Promise<SupportCheckoutResult> {
  if (!tier) throw new Error("Choose a support amount.")
  return settle(
    decodeCheckout(await post("/api/support/checkout", { tier }))
  )
}

export async function resumeCheckout(token: string): Promise<SupportCheckoutResult> {
  if (!token) throw new Error("No support order to resume.")
  return settle(
    decodeCheckout(await post("/api/support/resume", { token }))
  )
}

export async function getOrderStatus(token: string): Promise<SupportOrderSummary> {
  if (!token) throw new Error("No support order to check.")
  return decodeOrder(await post("/api/support/status", { token }))
}
