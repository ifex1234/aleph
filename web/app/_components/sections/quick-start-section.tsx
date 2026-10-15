import { Container } from "../ui/container"
import { Reveal } from "../ui/reveal"
import { SectionHeading } from "./section-heading"

const STEPS = [
  {
    no: "1",
    title: "Fetch the app",
    body: "Gratis for Windows, macOS and Linux — hymns ride along offline",
  },
  {
    no: "2",
    title: "Wire audio & choose a look",
    body: "Any desk feed, plus drifting-gradient or picture styling",
  },
  {
    no: "3",
    title: "Carry the full gathering",
    body: "Passages, hymns, lyrics, decks and timing over NDI",
  },
] as const

export function QuickStartSection() {
  return (
    <section
      id="download"
      aria-labelledby="quick-start-heading"
      className="py-20 lg:py-32"
    >
      <Container className="flex flex-col gap-10 md:gap-14 lg:gap-13">
        <Reveal>
          <SectionHeading
            id="quick-start-heading"
            subtitle="No login. No membership to begin. Just fetch the build, hook up the desk feed, and Aleph minds the screens from the opening song onward."
          >
            Live in less than five minutes.
          </SectionHeading>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 md:*:-mt-px md:*:-ml-px">
          {STEPS.map((s, i) => (
            <Reveal key={s.no} delay={Math.min(i * 80, 160)} className="flex">
              <div className="border-border-strong hover:bg-surface flex h-full min-h-80 w-full flex-col justify-between gap-8 border p-8 transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] md:min-h-100">
                <p className="text-2xl leading-8 font-medium tracking-[-0.04em] text-foreground">
                  {s.no}
                </p>
                <div className="flex flex-col gap-2">
                  <p className="text-2xl leading-8 font-medium tracking-[-0.04em] text-foreground">
                    {s.title}
                  </p>
                  <p className="text-lg leading-6 tracking-[-0.01em] text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
