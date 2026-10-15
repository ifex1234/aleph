import {
  IconMicrophone,
  IconPalette,
  IconSearch,
  IconScreenShare,
} from "@tabler/icons-react";
import { Container } from "../ui/container";
import { FeatureCard } from "../ui/feature-card";
import { Reveal } from "../ui/reveal";
import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    icon: IconMicrophone,
    title: "Listen",
    body: "Plug in your sermon audio. Aleph transcribes as people speak and files notes and transcripts on its own.",
  },
  {
    icon: IconSearch,
    title: "Detect & pick",
    body: "Scriptures surface from quotes or citations. Search 13,700+ hymns, your songs and slide decks from the same window.",
  },
  {
    icon: IconPalette,
    title: "Theme once",
    body: "Shape lower-thirds to full-screen looks with plates, shadows and moving gradients — a distinct theme per display.",
  },
  {
    icon: IconScreenShare,
    title: "Present everywhere",
    body: "Send verses, hymn stanzas, lyrics, timers or slides live through multi-output NDI to OBS, vMix and in-house screens.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="py-20 lg:py-[120px]"
    >
      <Container className="flex flex-col gap-10 md:gap-14 lg:gap-16">
        <Reveal>
          <SectionHeading
            id="how-it-works-heading"
            subtitle="From the first audio check to the final blessing — a single operator with one app covers every moment."
          >
            From sound check to benediction
          </SectionHeading>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 md:[&>*]:-ml-px md:[&>*]:-mt-px lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 80} className="flex">
              <FeatureCard
                icon={s.icon}
                title={s.title}
                body={s.body}
                iconTone="accent"
              />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
