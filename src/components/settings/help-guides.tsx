import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangleIcon,
  BookOpenIcon,
  BrainCircuitIcon,
  CastIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  HeartHandshakeIcon,
  ImagesIcon,
  MailIcon,
  MonitorIcon,
  MusicIcon,
  NotebookPenIcon,
  PaletteIcon,
  PresentationIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

/* -------------------------------------------------------------------------- */
/*  Guide content                                                             */
/* -------------------------------------------------------------------------- */

interface FeatureGuide {
  id: string
  icon: typeof MonitorIcon
  label: string
  summary: string
  steps: string[]
  troubleshooting?: string[]
}

/**
 * Written in the voice of a walkthrough: numbered steps that state what you
 * do, then what should happen. Every troubleshooting entry maps to a real
 * symptom, not generic advice.
 */
export const FEATURE_GUIDES: FeatureGuide[] = [
  {
    id: "monitor",
    icon: MonitorIcon,
    label: "Projector & second monitor setup",
    summary:
      "Show verses full-screen on a second display while you keep working on your main screen.",
    steps: [
      "Press Win + P and choose Extend. Aleph can only send content to a screen Windows treats as a separate display — in Duplicate mode both monitors mirror your whole PC.",
      "Open the Broadcast tab in the sidebar and click Broadcast Outputs.",
      "Click Add output and choose the External Display type.",
      "Pick the monitor the congregation sees. The display Aleph itself runs on is labelled “(Aleph screen)” — never select that one for projection.",
      "Choose a Screen fit: Letterbox keeps the whole verse visible (bars appear only if your screen's shape differs from the theme); Fill screen crops the edges so there are no bars; Stretch distorts to cover exactly.",
      "Pick a Theme, give the output a name like “Projector”, and save.",
      "Flip the output card's switch on. The second monitor lights up with the theme background.",
      "Present a verse — from AI Detections (Present), the Verse Queue, the book search, Lyrics, or Hymns. It appears on the projector instantly while your operator screen stays interactive.",
      "When the service ends, flip the switch off again.",
    ],
    troubleshooting: [
      "The second monitor shows exactly what I see on my PC — Windows is in Duplicate mode. Press Win + P and switch to Extend.",
      "The monitor is dark after switching to Extend — a projector only lights up once a display output is toggled on. Before you go live you'll see just the theme background.",
      "Verses have black bars around them — your monitor's shape differs from the theme's (e.g. a 1280×1024 panel is taller than 16:9). Set Screen fit to Fill screen, or keep Letterbox to always show the full verse.",
      "No verse appears — check the output card shows the red pulsing Live badge, and that you actually presented something (the output shows the theme background when nothing is live).",
      "A fullscreen verse covers my operator screen — that output targets the display labelled (Aleph screen). Your operator window is pinned on top so you can flip the output off; target the other monitor instead.",
    ],
  },
  {
    id: "speech",
    icon: BrainCircuitIcon,
    label: "Speech recognition & verse detection",
    summary:
      "Let Aleph listen to the sermon, transcribe it live, and surface every Bible reference.",
    steps: [
      "In Settings → Audio choose the microphone (or audio interface channel) feeding the preacher, and confirm the level meter moves when they speak.",
      "In Settings → API Keys paste your Deepgram API key — this powers the live transcription.",
      "In Settings → Speech Recognition pick the transcription quality that matches your connection, and add keyterms so church-specific words transcribe cleanly.",
      "In Settings → Bible Translation select the translation detections should look up (say “read in NIV” to switch it by voice).",
      "Press Start on the transcript panel. Speech streams to text in real time; when a verse reference or a quoted passage is recognised, it lights up in the Detections panel.",
      "Incomplete references are parked automatically — if the preacher says “in Genesis …” and finishes the reference a minute later, Aleph keeps the context.",
    ],
    troubleshooting: [
      "No transcript appears — check the microphone is selected and unmuted in Settings → Audio, and that your Deepgram key is valid in Settings → API Keys.",
      "Verses are missed — reduce background noise or move the microphone closer; keyterm boosting in Settings → Speech Recognition helps with book names.",
      "Wrong translation shown — say “read in ESV” or switch it in Settings → Bible Translation.",
    ],
  },
  {
    id: "present",
    icon: PresentationIcon,
    label: "Presenting verses & the queue",
    summary: "Push verses live, build a running order, and stay in control.",
    steps: [
      "Present an AI detection with one click, or find any verse by book, chapter and verse in the Book Search tab.",
      "Use Context Search to find verses by phrase or topic — Aleph uses AI matching when the semantic models are installed.",
      "Quick-nav: type “J” for Joshua, Tab to the chapter, type the verse number and press Enter.",
      "Queue verses you want to save for later with the Queue button, then drag to reorder them in the Verse Queue panel.",
      "Present from the queue mid-service by clicking it — the last-presented verse stays on screen until you change it.",
    ],
    troubleshooting: [
      "The wrong verse went live — press Present again on the right one; the projector updates instantly.",
      "Queue keeps shuffling — drag by the grip handle; the order persists per session.",
    ],
  },
  {
    id: "lyrics",
    icon: MusicIcon,
    label: "Lyrics",
    summary: "Type songs once, present them verse by verse.",
    steps: [
      "Open the Lyrics tab and write the song with a blank line between verses or chorus sections.",
      "Click Present — the song goes live and the footer shows one section at a time.",
      "Step through sections with the footer arrows or the keyboard arrow keys.",
      "Songs are saved automatically and can be reordered for reuse.",
    ],
    troubleshooting: [
      "Sections merge together — there must be a completely blank line between each verse or chorus.",
    ],
  },
  {
    id: "hymns",
    icon: BookOpenIcon,
    label: "Hymns",
    summary: "Over 13,000 hymns, searchable, presentable stanza by stanza.",
    steps: [
      "Open the Hymns tab and search by number, title, or the first line of any stanza.",
      "Click a hymn to see its stanzas and tunes where available.",
      "Click a stanza to present it live, then navigate with the footer controls.",
    ],
    troubleshooting: [
      "No hymns show — the hymn database ships with the app; if it was cleared, re-install or restore it from a backup.",
    ],
  },
  {
    id: "slides",
    icon: ImagesIcon,
    label: "Slides",
    summary: "Announcements, images, videos and PDFs on the big screen.",
    steps: [
      "Open the Slides tab and add an image, video, or PDF.",
      "Click a slide to present it; navigate with the footer controls.",
      "Slides mix freely with verse content — present verses again at any time and they take over the output.",
    ],
    troubleshooting: [
      "A video slide stutters — large files take a moment to load in the output window; keep videos to a few hundred MB for smooth playback.",
    ],
  },
  {
    id: "themes",
    icon: PaletteIcon,
    label: "Themes",
    summary: "Decide exactly how verses look on screen.",
    steps: [
      "Open the Themes tab to browse the built-in themes.",
      "Duplicate one and open the visual editor to change colours, fonts, background images or motion.",
      "Assign a theme per broadcast output, or pin your favourite so it's always first.",
      "Hands-on preview: any change you make renders immediately in the editor's live preview.",
    ],
    troubleshooting: [
      "Text is hard to read on the projector — increase the font size and pick a plain, high-contrast background; motion backgrounds at high resolution cost more GPU.",
    ],
  },
  {
    id: "remote",
    icon: CastIcon,
    label: "Remote control",
    summary: "Advance verses from your phone, tablet or lighting desk.",
    steps: [
      "In Settings → Remote Control note the OSC port (UDP 8000) and HTTP port (8080).",
      "OSC commands like /aleph/next and /aleph/prev step through the live content.",
      "HTTP: POST to /api/v1/command with a JSON command body from any device on the same network.",
      "This is also how you drive Aleph when its own screen is covered by a projector output — no keyboard needed.",
    ],
    troubleshooting: [
      "Remote commands do nothing — enable the remote server in Settings → Remote Control, and confirm both devices are on the same network and that no firewall is blocking the ports.",
    ],
  },
  {
    id: "diagnostics",
    icon: TerminalIcon,
    label: "Logs & fixing problems",
    summary: "Rotate, filter and export app logs for bug reports.",
    steps: [
      "In Settings → Diagnostics choose a time range (or “Everything”) and click Save logs….",
      "Attach the saved file when reporting a problem — Aleph never includes your API keys in logs.",
      "The Version row shows exactly which build you are on — quote it in bug reports.",
    ],
    troubleshooting: [
      "Nothing is saved — check the log folder shown in Diagnostics exists and isn't full; rotate storage if your disk is nearly full.",
    ],
  },
  {
    id: "notes",
    icon: NotebookPenIcon,
    label: "Notes",
    summary: "Keep service notes beside your controls, off the main output.",
    steps: [
      "Open the Notes panel to jot the running order, reminders, or prayer points.",
      "Notes live in a side panel and never appear on any display — only verses, lyrics and slides go live.",
      "Keep the panel open during the service; it stays put while you present other content.",
    ],
  },
  {
    id: "support",
    icon: HeartHandshakeIcon,
    label: "Support & donations",
    summary: "Reach the team, fund development, and see sister apps.",
    steps: [
      "The Support tab shows the contact address, sister apps, and current app version.",
      "One-time donations are processed securely through Bachs — pick your currency and an amount, or use the bank details if you prefer a transfer.",
    ],
  },
]

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function GuideCard({ guide }: { guide: FeatureGuide }) {
  const Icon = guide.icon
  return (
    <Collapsible className="rounded-lg border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center gap-3 p-4 text-left">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{guide.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {guide.summary}
          </p>
        </div>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
          <ol className="flex flex-col gap-2">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground">
                <span className="mt-px flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.625rem] font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {guide.troubleshooting && (
            <div className="flex flex-col gap-1.5 rounded-md bg-amber-500/5 p-2.5">
              {guide.troubleshooting.map((entry, i) => (
                <div key={i} className="flex gap-2 text-[0.6875rem] leading-relaxed text-muted-foreground">
                  <AlertTriangleIcon className="mt-0.5 size-3 shrink-0 text-amber-500" />
                  <span>{entry}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function FeatureGuides() {
  const [query, setQuery] = useState("")

  const guides = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FEATURE_GUIDES
    return FEATURE_GUIDES.filter(
      (g) =>
        g.label.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.steps.some((s) => s.toLowerCase().includes(q))
    )
  }, [query])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides…"
          aria-label="Search feature guides"
          className="h-9 pl-8 text-xs"
        />
      </div>

      {guides.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No guide matches “{query}”.
        </p>
      ) : (
        guides.map((guide) => <GuideCard key={guide.id} guide={guide} />)
      )}
    </div>
  )
}

const SUPPORT_EMAIL = "info@zeravest.ng"

/**
 * Same /info endpoint the Support tab uses. The server's `support` field is
 * the canonical address, so it can be changed without an app release; this
 * constant is only the offline fallback.
 */
const INFO_URL =
  (import.meta.env.VITE_INFO_URL as string | undefined) ??
  "https://zayine-server.vercel.app/info"

export function ContactCard() {
  const [email, setEmail] = useState(SUPPORT_EMAIL)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(INFO_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { support?: unknown } | null) => {
        const value =
          typeof data?.support === "string" && data.support.trim()
            ? data.support.trim()
            : null
        if (!cancelled && value) setEmail(value)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const submitContact = () => {
    const body = message.trim()
    const from = userEmail.trim()
    // Your email goes at the top of the body — mailto cannot set the From
    // address; the user's own default mail account sends it.
    if (!body) {
      setError("Write a short message first.")
      return
    }
    if (!from || !from.includes("@") || !from.includes(".")) {
      setError("Enter your email so the team can reply.")
      return
    }
    const enc = encodeURIComponent
    const composed = `From: ${from}\n\n${body}\n\n— sent from the Aleph Help tab`
    window.open(
      `mailto:${email}?subject=${enc(subject.trim() || "Aleph enquiry")}&body=${enc(composed)}`,
      "_blank",
      "noopener"
    )
    setOpen(false)
    setUserEmail("")
    setSubject("")
    setMessage("")
    setError(null)
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <MailIcon className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Contact us</p>
          <p className="text-xs text-muted-foreground">
            Questions, enquiries, or complaints — we read every message.{" "}
            <span className="font-mono">{email}</span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(email)
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
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            setError(null)
            setOpen(true)
          }}
        >
          <MailIcon className="mr-1.5 size-3.5" />
          Email us
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Aleph</DialogTitle>
            <DialogDescription>
              Your message opens in your email app addressed to{" "}
              <span className="font-mono">{email}</span>. For complaints or
              support, include what happened and when.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="contact-user-email"
                className="text-xs text-muted-foreground"
              >
                Your email (for replies)
              </label>
              <Input
                id="contact-user-email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="contact-subject"
                className="text-xs text-muted-foreground"
              >
                Subject
              </label>
              <Input
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Verse detection issue"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="contact-message"
                className="text-xs text-muted-foreground"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question, enquiry or complaint…"
                rows={5}
                className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none disabled:opacity-50"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitContact}>
              <MailIcon className="mr-1.5 size-3.5" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
