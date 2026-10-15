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
    body: "Connect sermon audio. Aleph transcribes live and auto-captures notes and transcripts as you go.",
  },
  {
    icon: IconSearch,
    title: "Detect & pick",
    body: "Verses surface from quotes or references. Search 13,700+ hymns or your songs and slides in the same window.",
  },
  {
    icon: IconPalette,
    title: "Theme once",
    body: "Design lower-thirds to fullscreen with plates, shadows and animated gradients. Per-output themes for each screen.",
  },
  {
    icon: IconScreenShare,
    title: "Present everywhere",
    body: "Verse, hymn stanza, lyrics, timer or slides air instantly via multi-output NDI to OBS, vMix and sanctuary.",
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
            subtitle="From first audio check to final benediction — one operator, one app, every moment covered."
          >
            How it works
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
