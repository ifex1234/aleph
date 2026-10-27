import type { Metadata } from "next"
import { SiteNav } from "../_components/sections/site-nav"
import { SiteFooter } from "../_components/sections/site-footer"
import { Container } from "../_components/ui/container"
import { SITE } from "../_lib/site"

const LAST_UPDATED = "October 23, 2026"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Aleph handles your data: local-first transcription, on-device hymn and Bible libraries, and cloud transcription only when you add your own Deepgram key.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `Privacy Policy — ${SITE.name}`,
    description:
      "Local-first by design: your audio, notes and libraries stay on your machine. Cloud transcription runs only on your own API key.",
    url: `${SITE.url}/privacy`,
    type: "article",
  },
}

const SECTIONS = [
  {
    id: "overview",
    heading: "Overview",
    body: [
      "Aleph is built local-first. There is no Aleph account, no sign-in, and no Aleph cloud holding your congregation's data. Your sermon audio, transcriptions, songs, notes, slide decks and settings live on the computer running the app, and this website sets no cookies or tracking scripts. We record anonymous, aggregate counts of visits and downloads; no personal data is tied to those counts.",
    ],
  },
  {
    id: "on-device",
    heading: "What stays on your device",
    body: [
      "The free transcription tier runs Whisper directly on your machine: sermon audio is processed locally and never leaves the room. The Bible translations, 13,700+ hymns, saved songs, sermon notes, slide decks, timer history and themes are kept in on-device libraries. Deleting the app's data removes them.",
    ],
  },
  {
    id: "deepgram",
    heading: "Cloud transcription is opt-in",
    body: [
      "If you paste in your own Deepgram API key for the Pro tier, sermon audio is streamed to Deepgram for transcription under your key and their terms — Aleph never sees, stores or proxies that audio. Usage is billed by Deepgram (their $200 starter credit, then roughly $0.73 per two-hour sermon). Remove the key at any time to return fully offline.",
    ],
  },
  {
    id: "updates",
    heading: "Automatic updates",
    body: [
      "Aleph periodically contacts GitHub Releases to check for new versions and downloads installers in the background, applying them when you quit. These checks exchange only the current version number — no personal data, no audio, no libraries.",
    ],
  },
  {
    id: "ndi",
    heading: "Live output and networks",
    body: [
      "Verses, hymns, lyrics, timers and slides leave the app only as video over NDI to the production tools and screens you configure (OBS Studio, vMix, sanctuary displays). Nothing is uploaded to Aleph or any third party in the process.",
    ],
  },
  {
    id: "website",
    heading: "This website",
    body: [
      "These pages are pre-rendered static files: no accounts, no cookies, no tracking scripts. We record anonymous, aggregate counts of page visits and installer downloads; these counts contain no personal data and are not used for advertising or cross-site tracking. The GitHub star count shown on the homepage is fetched server-side from the public GitHub API. Following outbound links (GitHub, X, LinkedIn) or emailing info@zeravest.ng puts you under those services' own policies.",
    ],
  },
  {
    id: "children",
    heading: "Children",
    body: [
      "Aleph is operated by adults running church production. It is not directed at children, and we knowingly collect nothing from anyone — child or adult.",
    ],
  },
  {
    id: "rights",
    heading: "Your rights and contact",
    body: [
      "Because Aleph holds no cloud copy of your data, there is nothing to request, export or delete from us — everything is already in your hands, on your machine. For privacy questions, email info@zeravest.ng and include “Privacy” in the subject.",
    ],
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: [
      "If this policy changes, the updated date below moves with it and material changes are noted in the release notes. Continued use of the app after changes take effect means you accept the updated policy.",
    ],
  },
]

export default async function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main>
        <Container className="max-w-220 py-20 md:py-24">
          <p className="text-sm font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Legal
          </p>
          <h1 className="mt-3 text-4xl leading-[1.05] font-medium tracking-[-0.035em] text-balance text-foreground sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-[15px] leading-6 text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>
          <div className="mt-10 flex flex-col">
            {SECTIONS.map((s, i) => (
              <section
                key={s.id}
                aria-labelledby={`${s.id}-heading`}
                className={
                  i > 0 ? "border-border-strong border-t py-8" : "pb-8"
                }
              >
                <h2
                  id={`${s.id}-heading`}
                  className="text-xl leading-8 font-medium tracking-[-0.02em] text-foreground md:text-2xl"
                >
                  {s.heading}
                </h2>
                {s.body.map((p) => (
                  <p
                    key={p.slice(0, 24)}
                    className="mt-3 text-[17px] leading-7 tracking-[-0.01em] text-muted-foreground"
                  >
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </Container>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Privacy Policy — ${SITE.name}`,
            url: `${SITE.url}/privacy`,
            description: metadata.description,
            inLanguage: "en",
            dateModified: "2026-10-15",
          }),
        }}
      />
    </>
  )
}
