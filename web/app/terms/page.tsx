import type { Metadata } from "next";
import { SiteNav } from "../_components/sections/site-nav";
import { SiteFooter } from "../_components/sections/site-footer";
import { Container } from "../_components/ui/container";
import { SITE, getGitHubStars } from "../_lib/site";

const LAST_UPDATED = "October 15, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for using Aleph: a free MIT-licensed app, bring-your-own-key cloud transcription, operator responsibility for live output, and as-is warranty.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: `Terms of Service — ${SITE.name}`,
    description:
      "Free open-source software under the MIT license. You operate the live output; cloud transcription is billed by your provider.",
    url: `${SITE.url}/terms`,
    type: "article",
  },
};

const SECTIONS = [
  {
    id: "deal",
    heading: "The deal in one paragraph",
    body: [
      "Aleph is free, open-source software released under the MIT license, published on GitHub by openbezal. You may download, use, study and modify it. The full license text in the repository controls where it differs from this summary.",
    ],
  },
  {
    id: "tiers",
    heading: "Free tier and Pro keys",
    body: [
      "The built-in transcription tier costs nothing and works offline. The Pro tier requires your own Deepgram API key: Deepgram bills you directly (about $0.73 per two-hour sermon after their starter credit), and their terms govern that service. Aleph adds no markup, takes no cut, and owes you nothing for Deepgram outages or price changes.",
    ],
  },
  {
    id: "operator",
    heading: "You operate the live output",
    body: [
      "AI verse spotting is a guess, however good — it can mishear, misattribute or miss a passage entirely. Always verify scripture on the operator preview before it reaches the congregation, the stream or the recording. You are responsible for everything Aleph puts on your screens.",
    ],
  },
  {
    id: "rights",
    heading: "Only project what you may show",
    body: [
      "Songs, hymn texts, images, video and PDFs you load into Aleph belong to their owners. CCLI, denominational hymnals and stock libraries each carry their own display, lyrics-reprint and streaming rules — clearing them is your job, not the app's. Aleph grants no performance or reproduction rights.",
    ],
  },
  {
    id: "third-parties",
    heading: "Third-party services",
    body: [
      "Aleph leans on services you configure: Deepgram for cloud transcription, GitHub Releases for updates, and OBS Studio, vMix or NDI receivers for output. Each has its own terms and privacy policy, which apply alongside these terms when you use them.",
    ],
  },
  {
    id: "unsigned",
    heading: "Unsigned software notice",
    body: [
      "Aleph ships without a paid Apple or Windows signing certificate, so both systems warn on first launch. That warning describes the project's budget, not its safety — but you install and run the app at your own discretion all the same.",
    ],
  },
  {
    id: "updates",
    heading: "Updates can change things",
    body: [
      "Background updates may add, alter or remove features as the project evolves. If an update doesn't suit your setup, prior releases remain available on the GitHub releases page under the same MIT license.",
    ],
  },
  {
    id: "warranty",
    heading: "No warranty, limited liability",
    body: [
      "To the maximum extent the law allows, Aleph is provided “as is,” without warranties of any kind — including merchantability, fitness for a particular purpose, accuracy of AI output, or uninterrupted service. In no event are the contributors liable for indirect, incidental or consequential damages, including a mistimed verse or a missed cue on Sunday morning. Your sole remedy for dissatisfaction is to stop using the software.",
    ],
  },
  {
    id: "misuse",
    heading: "Acceptable use",
    body: [
      "Use Aleph lawfully and honestly: don't misrepresent AI-generated output as human-checked where it matters, don't feed it content you have no right to process, and don't use it to harass, deceive or infringe. We may point to violations publicly in the repository, but there is no account to suspend — the software is yours.",
    ],
  },
  {
    id: "changes",
    heading: "Changes and contact",
    body: [
      "These terms may change; the updated date below moves with each revision and continued use means acceptance. Questions about these terms go to hello@openbezal.com with “Terms” in the subject.",
    ],
  },
];

export default async function TermsPage() {
  const stars = await getGitHubStars();
  return (
    <>
      <SiteNav stars={stars} />
      <main>
        <Container className="max-w-[880px] py-20 md:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Legal
          </p>
          <h1 className="mt-3 text-balance text-4xl font-medium leading-[1.05] tracking-[-0.035em] text-foreground sm:text-5xl">
            Terms of Service
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
                  i > 0 ? "border-t border-border-strong py-8" : "pb-8"
                }
              >
                <h2
                  id={`${s.id}-heading`}
                  className="text-xl font-medium leading-8 tracking-[-0.02em] text-foreground md:text-2xl"
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
            name: `Terms of Service — ${SITE.name}`,
            url: `${SITE.url}/terms`,
            description: metadata.description,
            inLanguage: "en",
            dateModified: "2026-10-15",
          }),
        }}
      />
    </>
  );
}
