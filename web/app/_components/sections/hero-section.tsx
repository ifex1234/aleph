import { Container } from "../ui/container"
import { DownloadButton } from "../ui/download-button"

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative overflow-hidden"
      aria-label="Aleph introduction"
    >
      <HeroGlow />
      <Container
        as="div"
        className="relative flex flex-col items-center gap-12 py-20 text-center md:py-24 lg:py-28"
      >
        <div className="hero-enter hero-enter-1 flex max-w-207.5 flex-col items-center gap-6">
          <h1 className="text-[44px] leading-[1.05] font-medium tracking-[-0.035em] text-balance text-foreground sm:text-[56px] md:text-[72px] lg:text-[84px] lg:tracking-[-0.05em]">
            <span>One app for the </span>
            <span className="text-accent">whole service.</span>
          </h1>
          <p className="text-base leading-normal text-pretty text-muted-foreground sm:text-lg md:text-xl lg:text-2xl lg:leading-8">
            Aleph detects Bible verses live from sermon audio, projects 13,700+
            offline hymns and song lyrics, runs slides, notes and timer — all
            through animated themes and multi-output NDI for OBS, vMix and your
            sanctuary screens.
          </p>
        </div>

        <div className="hero-enter hero-enter-2 flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <DownloadButton />
          </div>
          <p className="text-[15px] leading-6 text-muted-foreground">
            Free for Windows, macOS and Linux • Offline hymns included
          </p>
        </div>
      </Container>
    </section>
  )
}

function HeroGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-[520px] w-full max-w-[1440px] opacity-60"
      style={{
        background:
          "radial-gradient(60% 50% at 50% 0%, rgba(220,38,38,0.18) 0%, rgba(220,38,38,0.05) 40%, transparent 70%)",
      }}
    />
  )
}
