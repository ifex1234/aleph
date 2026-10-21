import { useEffect, useState } from "react"
import {
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  HeartHandshakeIcon,
  ImageIcon,
  LayoutGridIcon,
  RefreshCwIcon,
} from "lucide-react"
import { toast } from "sonner"
import { invoke } from "@tauri-apps/api/core"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

/* -------------------------------------------------------------------------- */
/*  Types (mirror GET /info from zayine-server)                                */
/* -------------------------------------------------------------------------- */

interface SisterApp {
  name: string
  icon: string
  link: string
}

interface BankDetails {
  bank_name: string
  account_name: string
  account_number: string
}

interface SupportInfo {
  name: string
  support: string
  about: string
  app: SisterApp[]
  bank?: BankDetails | null
}

const INFO_URL =
  (import.meta.env.VITE_INFO_URL as string | undefined) ??
  "https://zayine-server.vercel.app/info"

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export function SupportSection() {
  const [info, setInfo] = useState<SupportInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [iconFailed, setIconFailed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(INFO_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as SupportInfo
        if (!cancelled) setInfo(data)
      } catch (e) {
        if (!cancelled) setError(String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <OnlineSupportCard />
        <div className="flex items-center justify-center py-16">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className="flex flex-col gap-4">
        <OnlineSupportCard />
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-xs text-muted-foreground">
            Could not load support info. Check your connection and try again.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null)
              setInfo(null)
              setLoading(true)
              fetch(INFO_URL)
                .then((res) => {
                  if (!res.ok) throw new Error(`HTTP ${res.status}`)
                  return res.json()
                })
                .then((data) => setInfo(data as SupportInfo))
                .catch((e) => setError(String(e)))
                .finally(() => setLoading(false))
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const bank = info.bank
  const hasBank =
    !!bank && !!(bank.bank_name || bank.account_name || bank.account_number)

  return (
    <div className="flex flex-col gap-4">
      {/* About */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpenIcon className="size-4 text-primary" />
          </div>
          <p className="text-sm font-medium">About</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Aleph is a free and open-source app and a product of Zeravest
          technologies. It is built with care and love to help you manage your
          tasks and projects efficiently. We appreciate your support in keeping
          Aleph alive and improving.
        </p>
      </div>

      {/* Support us */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <HeartHandshakeIcon className="size-4 text-primary" />
          </div>
          <p className="text-sm font-medium">Support us</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          We are committed to building quality apps, you can send support via
        </p>
        {hasBank && bank && (
          <Collapsible className="mt-2">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              Bank account details
              <ChevronDownIcon className="size-3.5 transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-col gap-2.5">
                {bank.bank_name && (
                  <BankRow label="Bank" value={bank.bank_name} />
                )}
                {bank.account_name && (
                  <BankRow label="Account name" value={bank.account_name} />
                )}
                {bank.account_number && (
                  <div className="flex items-end justify-between gap-2">
                    <BankRow
                      label="Account number"
                      value={bank.account_number}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            bank.account_number
                          )
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        } catch {
                          /* clipboard unavailable */
                        }
                      }}
                    >
                      {copied ? (
                        <>
                          <CheckIcon className="mr-1 size-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <CopyIcon className="mr-1 size-3.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <OnlineSupportCard />

      {/* Our apps */}
      {info.app.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <LayoutGridIcon className="size-4 text-primary" />
            </div>
            <p className="text-sm font-medium">Our apps</p>
          </div>
          <div className="flex flex-col">
            {info.app.map((app) => (
              <button
                key={app.name}
                type="button"
                onClick={() => window.open(app.link, "_blank", "noopener")}
                className="flex items-center gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-muted/50"
              >
                {iconFailed[app.name] || !app.icon ? (
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <ImageIcon className="size-5 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={app.icon}
                    alt={`${app.name} icon`}
                    className="size-11 shrink-0 rounded-xl object-cover"
                    onError={() =>
                      setIconFailed((prev) => ({ ...prev, [app.name]: true }))
                    }
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">
                    {app.name}
                  </span>
                  <span className="block truncate text-[0.625rem] text-muted-foreground">
                    {app.link}
                  </span>
                </span>
                <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-2 text-center text-[0.625rem] text-muted-foreground">
        {info.name}
      </p>
    </div>
  )
}

const SUPPORT_ORDER_KEY = "aleph.support.order.v1"

interface OnlineSupportOrder {
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

interface OnlineSupportResult {
  token: string
  pending: boolean
  order: OnlineSupportOrder
}

const ONLINE_TIERS = [
  { key: "small", label: "₦2,000" },
  { key: "regular", label: "₦5,000" },
  { key: "generous", label: "₦10,000" },
] as const

function formatNaira(amount: string) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return `₦${amount}`
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function readStoredToken(): string | null {
  try {
    const stored = window.localStorage.getItem(SUPPORT_ORDER_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as { token?: unknown }
    return typeof parsed.token === "string" && parsed.token
      ? parsed.token
      : null
  } catch {
    return null
  }
}

function OnlineSupportCard() {
  const [tier, setTier] = useState<string>("regular")
  const [token, setToken] = useState<string | null>(readStoredToken)
  const [order, setOrder] = useState<OnlineSupportOrder | null>(null)
  const [starting, setStarting] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [expired, setExpired] = useState(false)
  const status = order?.status

  useEffect(() => {
    if (!token) return
    window.localStorage.setItem(SUPPORT_ORDER_KEY, JSON.stringify({ token }))
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    invoke<OnlineSupportOrder>("support_order_status", { token })
      .then((next) => {
        if (!cancelled) setOrder(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    if (status !== "pending" && status !== "creating") return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const check = async () => {
      try {
        const next = await invoke<OnlineSupportOrder>("support_order_status", {
          token,
        })
        if (cancelled) return
        setOrder(next)
        if (next.status === "pending" || next.status === "creating") {
          timer = setTimeout(check, 5000)
        }
      } catch {
        if (!cancelled) timer = setTimeout(check, 10000)
      }
    }

    timer = setTimeout(check, 4000)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [token, status])

  useEffect(() => {
    if (status !== "pending" || !order?.expires_at) return
    const deadline = new Date(order.expires_at).getTime()
    if (!Number.isFinite(deadline)) return
    const remaining = deadline - Date.now()
    const timer = setTimeout(() => setExpired(true), Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [status, order?.expires_at])

  async function startSupport() {
    setStarting(true)
    try {
      const result = await invoke<OnlineSupportResult>(
        "support_create_checkout",
        { tier }
      )
      setToken(result.token)
      setOrder(result.order)
      setExpired(false)
      if (result.pending) {
        toast.message("Confirming your payment page", {
          description:
            "If the browser did not open, use Reopen payment page below.",
        })
      } else {
        toast.success("Payment page opened in your browser")
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setStarting(false)
    }
  }

  async function resumeSupport() {
    if (!token) return
    setResuming(true)
    try {
      const result = await invoke<OnlineSupportResult>(
        "support_resume_checkout",
        { token }
      )
      setOrder(result.order)
      setExpired(false)
      if (result.pending) {
        toast.message("Still confirming your payment page", {
          description: "We will keep checking for the payment.",
        })
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setResuming(false)
    }
  }

  function startOver() {
    setToken(null)
    setOrder(null)
    setExpired(false)
    window.localStorage.removeItem(SUPPORT_ORDER_KEY)
  }

  const selected = ONLINE_TIERS.find((option) => option.key === tier)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <CreditCardIcon className="size-4 text-primary" />
        </div>
        <p className="text-sm font-medium">Support Aleph online</p>
      </div>

      {order?.status === "paid" ? (
        <PaidReceipt order={order} onReset={startOver} />
      ) : order?.status === "held" ? (
        <HeldNotice order={order} onReset={startOver} />
      ) : (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Aleph is free to use. If it has been a blessing, you can send a
            one-time gift securely through Bachs.
          </p>

          <div
            className="mt-3 grid grid-cols-3 gap-2"
            role="group"
            aria-label="Support amount"
          >
            {ONLINE_TIERS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={tier === option.key}
                onClick={() => setTier(option.key)}
                className={
                  tier === option.key
                    ? "rounded-md border border-primary bg-primary/10 px-2 py-2 text-center text-primary"
                    : "rounded-md border border-border px-2 py-2 text-center transition-colors hover:bg-muted/50"
                }
              >
                <span className="block text-sm font-semibold">
                  {option.label}
                </span>
                <span className="block text-[0.5625rem] font-medium tracking-wider text-muted-foreground uppercase">
                  one-time
                </span>
              </button>
            ))}
          </div>

          {status === "pending" || status === "creating" ? (
            <div className="mt-3 rounded-md bg-muted/50 p-2.5">
              {expired ? (
                <>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This payment link expired. Start a new one when you are
                    ready.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 text-xs"
                    onClick={startOver}
                  >
                    <RefreshCwIcon className="mr-1.5 size-3.5" />
                    Start over
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Waiting for payment confirmation…
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={resumeSupport}
                      disabled={resuming}
                    >
                      {resuming ? "Opening…" : "Reopen payment page"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={startOver}
                    >
                      Start over
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {status === "failed" && (
                <p className="mt-2 text-xs text-destructive">
                  The last attempt did not complete. Please try again.
                </p>
              )}
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={startSupport}
                disabled={starting}
              >
                {starting ? (
                  <>
                    <div className="mr-1.5 size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Opening payment page…
                  </>
                ) : (
                  <>
                    <HeartHandshakeIcon className="mr-1.5 size-3.5" />
                    Support with {selected ? selected.label : "a gift"}
                  </>
                )}
              </Button>
            </>
          )}

          <p className="mt-2 text-[0.625rem] leading-relaxed text-muted-foreground">
            One-time payment. Bachs securely processes the charge; Aleph never
            sees your card details.
          </p>
        </>
      )}
    </div>
  )
}

function PaidReceipt({
  order,
  onReset,
}: {
  order: OnlineSupportOrder
  onReset: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-md bg-primary/5 p-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <CheckIcon className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold">
            Thank you for supporting Aleph
          </p>
          <p className="mt-0.5 text-[0.625rem] text-muted-foreground">
            {formatNaira(order.amount)} received
            {order.paid_at ? ` on ${formatDate(order.paid_at)}` : ""}.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-md border border-border/70 p-2.5">
        <ReceiptRow label="Amount" value={formatNaira(order.amount)} />
        <ReceiptRow label="Reference" value={order.reference} mono />
        <ReceiptRow
          label="Date"
          value={formatDate(order.paid_at) || formatDate(order.created_at)}
        />
      </div>
      <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
        This was a one-time gift. No recurring charge was created. Keep this
        reference for your records.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="self-start"
        onClick={onReset}
      >
        Support again
      </Button>
    </div>
  )
}

function HeldNotice({
  order,
  onReset,
}: {
  order: OnlineSupportOrder
  onReset: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-amber-500/10 p-3">
        <p className="text-xs font-semibold">
          Payment received, pending verification
        </p>
        <p className="mt-1 text-[0.625rem] leading-relaxed text-muted-foreground">
          We could not match this payment to your order automatically. Keep this
          reference:
        </p>
        <p className="mt-1.5 font-mono text-[0.625rem] break-all">
          {order.reference}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="self-start"
        onClick={onReset}
      >
        <RefreshCwIcon className="mr-1.5 size-3.5" />
        Start over
      </Button>
    </div>
  )
}

function ReceiptRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[0.5625rem] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={
          mono
            ? "truncate font-mono text-[0.625rem] text-foreground"
            : "truncate text-xs font-semibold text-foreground"
        }
      >
        {value}
      </span>
    </div>
  )
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.5625rem] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  )
}
