import { useEffect, useState } from "react"
import {
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  HeartHandshakeIcon,
  ImageIcon,
  LayoutGridIcon,
} from "lucide-react"
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
      <div className="flex items-center justify-center py-16">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !info) {
    return (
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
          {info.about}
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
                    <BankRow label="Account number" value={bank.account_number} />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            bank.account_number,
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
