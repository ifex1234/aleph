import { Container } from "../ui/container"
import { DownloadButton } from "../ui/download-button"
import { Reveal } from "../ui/reveal"

export function FinalCtaSection() {
  return (
    <section aria-labelledby="final-cta-heading" className="py-20 lg:py-30">
      <Container className="flex flex-col items-center gap-12 text-center">
        <Reveal>
          <h2
            id="final-cta-heading"
            className="text-[40px] leading-[1.05] font-medium tracking-[-0.035em] text-balance text-foreground sm:text-[56px] md:text-[72px] lg:text-[84px] lg:tracking-tighter"
          >
            Innovating church{" "}
            <span className="text-accent">presentations with AI</span>
          </h2>
        </Reveal>
        <Reveal className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <DownloadButton />
          </div>
          <p className="text-[15px] leading-6 text-muted-foreground">
            Free for Windows, macOS and Linux • Offline hymns included
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
