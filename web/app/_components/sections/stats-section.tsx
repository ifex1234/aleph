import { Container } from "../ui/container"
import { Reveal } from "../ui/reveal"
import { SITE } from "../../_lib/site"

export function StatsSection() {
  const items = [
    { value: SITE.stats.hymns, label: "Offline hymns built in" },
    { value: SITE.stats.translations, label: "Bible Translations" },
    { value: "6-in-1", label: "Verses, hymns, lyrics, slides, notes, timer" },
  ]

  return (
    <section aria-label="Project stats" className="py-16 md:py-24 lg:py-30">
      <Container>
        <div className="divide-border-strong grid grid-cols-1 sm:grid-cols-2 sm:divide-x lg:grid-cols-3 lg:divide-x">
          {items.map((item, i) => (
            <Reveal
              key={item.label}
              delay={i * 80}
              className="flex flex-col items-center justify-center gap-0.5 px-6 py-8 text-center"
            >
              <p className="text-5xl leading-none font-medium tracking-[-0.02em] text-foreground sm:text-6xl lg:text-[62px]">
                {item.value}
              </p>
              <p className="text-lg text-muted-foreground lg:text-2xl lg:leading-8">
                {item.label}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
