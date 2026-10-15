import { IconCheck } from "@tabler/icons-react"
import { Button } from "../ui/button"
import { Container } from "../ui/container"
import { Reveal } from "../ui/reveal"
import { SectionHeading } from "./section-heading"
import { SITE } from "../../_lib/site"
import { cn } from "../../_lib/utils"

const FREE_FEATURES = [
  "Whisper transcription, running on-device once downloaded",
  "₦0 a sermon — no key, no login",
  "Hymns, lyrics, decks, notes and timer all bundled",
  "Suited to pricey data or shaky venue internet",
] as const

const PRO_FEATURES = [
  "Nova-3 streaming boosted with Bible keyterms",
  "Use your personal Deepgram key — billed by them, near $0.73 per two-hour sermon",
  "Their $200 starting credit stretches to about 273 sermons (Approximateley 5years of weekly 2-hour gatherings)",
  "Swifter, sharper live spotting for bigger auditoriums",
] as const

export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="py-20 lg:py-30"
    >
      <Container className="flex flex-col gap-10">
        <Reveal>
          <SectionHeading
            id="pricing-heading"
            subtitle="The app is free and will forever remain free. Cloud transcription is the only thing that can cost money — and only when you opt into it."
          >
            Simple, honest pricing
          </SectionHeading>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 md:*:-mt-px md:*:-ml-px">
          <Reveal className="flex">
            <div className="hover:bg-surface flex h-full w-full flex-col gap-6 border border-border bg-background p-8 transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] md:p-10">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Free offline service · No API key
                </p>
                <p className="text-[34px] leading-none font-medium tracking-[-0.04em] text-foreground">
                  ₦0
                </p>
                <p className="text-lg leading-8 text-muted-foreground">
                  Offline transcription for every congregation, every Sunday.
                </p>
              </div>
              <ul className="flex flex-col gap-2.5">
                {FREE_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[15px] leading-6 text-muted-foreground"
                  >
                    <IconCheck
                      size={16}
                      aria-hidden
                      stroke={2.5}
                      className="mt-1 shrink-0 text-accent"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                <Button href={SITE.repo.releases} variant="primary">
                  Download on Windows, macOS or Linux
                </Button>
              </div>
            </div>
          </Reveal>
          <Reveal delay={80} className="flex">
            <div
              className={cn(
                "border-border-strong bg-surface/40 relative flex h-full w-full flex-col gap-6 border p-8",
                "hover:bg-surface transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] md:p-10"
              )}
            >
              <p
                aria-hidden
                className="absolute top-6 right-6 rounded-full bg-accent px-3 py-1 text-xs font-medium tracking-wide text-white"
              >
                Recommended
              </p>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Online service · Your own API key
                </p>
                <p className="text-[34px] leading-none font-medium tracking-[-0.04em] text-foreground">
                  ~$0.73{" "}
                  <span className="text-lg text-muted-foreground">
                    / 2-hr sermon
                  </span>
                </p>
                <p className="text-lg leading-8 text-muted-foreground">
                  Cloud pace and precision billed straight by Deepgram — close
                  to ₦1,120 at today&apos;s rates, cheaper than a couple of
                  gigabytes of mobile data.
                </p>
              </div>
              <ul className="flex flex-col gap-2.5">
                {PRO_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[15px] leading-6 text-muted-foreground"
                  >
                    <IconCheck
                      size={16}
                      aria-hidden
                      stroke={2.5}
                      className="mt-1 shrink-0 text-accent"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto space-x-3 pt-2">
                <Button href={SITE.repo.releases} variant="primary">
                  Download
                </Button>
                <Button
                  href="https://deepgram.com"
                  variant="primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sign up for a Deepgram account
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal>
          <p className="text-center text-[15px] leading-6 text-muted-foreground">
            Around ₦4,480 monthly for four weekly gatherings, once the starter
            credit is spent. Nothing goes to Aleph — no membership, no login, no
            per-minute surcharge. Figures track Deepgram&apos;s promo pricing;
            naira amounts drift with exchange rates.
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
