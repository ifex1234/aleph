import { IconCheck } from "@tabler/icons-react"
import { Button } from "../ui/button"
import { Container } from "../ui/container"
import { Reveal } from "../ui/reveal"
import { SectionHeading } from "./section-heading"
import { SITE } from "../../_lib/site"
import { cn } from "../../_lib/utils"

const FREE_FEATURES = [
  "Whisper transcription, fully offline after download",
  "₦0 per sermon — no API key, no account",
  "13,700+ hymns, lyrics, slides, notes & timer included",
  "Best where data is costly or signal is unreliable",
] as const

const PRO_FEATURES = [
  "Nova-3 streaming + Bible keyterm prompting",
  "Bring your own Deepgram key — pay them directly, ~$0.73 per 2-hr sermon",
  "$200 free Deepgram credit ≈ 273 sermons (~5 years of weekly services)",
  "Faster, more accurate live detection for large sanctuaries",
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
            subtitle="Aleph itself is free and open source forever. You only ever pay Deepgram for cloud transcription — and only if you choose it."
          >
            Pricing
          </SectionHeading>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 md:*:-mt-px md:*:-ml-px">
          <Reveal className="flex">
            <div className="hover:bg-surface flex h-full w-full flex-col gap-6 border border-border bg-background p-8 transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] md:p-10">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Free
                </p>
                <p className="text-[34px] leading-none font-medium tracking-[-0.04em] text-foreground">
                  ₦0
                </p>
                <p className="text-lg leading-8 text-muted-foreground">
                  Offline transcription for every church, every Sunday.
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
                <Button href={SITE.repo.releases} variant="secondary">
                  Download free
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
                  Pro · Bring your own key
                </p>
                <p className="text-[34px] leading-none font-medium tracking-[-0.04em] text-foreground">
                  ~$0.73{" "}
                  <span className="text-lg text-muted-foreground">
                    / 2-hr sermon
                  </span>
                </p>
                <p className="text-lg leading-8 text-muted-foreground">
                  Cloud speed and accuracy, paid straight to Deepgram — roughly
                  ₦1,120 at current rates, less than 2–3GB of mobile data.
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
            About ₦4,480 a month for 4 weekly services — after the free credit
            runs out. No subscription to Aleph, no account, no per-minute
            markup. Estimates from Deepgram promo pricing; naira figures move
            with the exchange rate.
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
