import { IconBuildingChurch, IconUsers, IconVideo } from "@tabler/icons-react";
import { Container } from "../ui/container";
import { FeatureCard } from "../ui/feature-card";
import { Reveal } from "../ui/reveal";
import { SectionHeading } from "./section-heading";

const AUDIENCE = [
  {
    icon: IconUsers,
    title: "Church media teams",
    body: "A single volunteer runs passages, hymns, lyrics and decks — no swapping apps mid-sermon",
  },
  {
    icon: IconVideo,
    title: "Livestream operators",
    body: "Separate NDI feeds with their own styling for the broadcast, hall and overflow rooms",
  },
  {
    icon: IconBuildingChurch,
    title: "Worship leaders & events",
    body: "Thousands of offline hymns, a reusable songbook and a stage timer, from rehearsal to revival",
  },
] as const;

export function AudienceSection() {
  return (
    <section
      aria-labelledby="audience-heading"
      className="py-20 lg:py-[120px]"
    >
      <Container className="flex flex-col gap-10 md:gap-14 lg:gap-16">
        <Reveal>
          <SectionHeading id="audience-heading">Built for your team</SectionHeading>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 md:[&>*]:-ml-px md:[&>*]:-mt-px">
          {AUDIENCE.map((a, i) => (
            <Reveal key={a.title} delay={i * 80} className="flex">
              <FeatureCard
                icon={a.icon}
                title={a.title}
                body={a.body}
                iconTone="accent"
              />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
