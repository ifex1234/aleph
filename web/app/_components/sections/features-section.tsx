import {
  IconAdjustmentsHorizontal,
  IconBook,
  IconClock,
  IconLayoutBoard,
  IconMicrophone,
  IconMusic,
  IconNotes,
  IconPhoto,
  IconPlug,
} from "@tabler/icons-react";
import { Container } from "../ui/container";
import { FeatureCard } from "../ui/feature-card";
import { Reveal } from "../ui/reveal";
import { SectionHeading } from "./section-heading";

import type { Icon as TablerIcon } from "@tabler/icons-react";

type Feature = {
  icon: TablerIcon;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: IconMicrophone,
    title: "Live AI verse spotting",
    body: "Follows the sermon feed, converts speech to text on the fly and pulls up passages from direct mentions or loose paraphrases. The operator stays in charge — suggestions never override what's already live.",
  },
  {
    icon: IconBook,
    title: "13,700+ hymns without internet",
    body: "A complete hymnal lives inside the app, searchable by number, title, opening line or any lyric. Open a hymn for credits, key and meter, then push any stanza to the screens in one click.",
  },
  {
    icon: IconMusic,
    title: "Lyrics that follow the song",
    body: "Store songs with Verse, Chorus and Bridge parts picked out automatically. Every stanza becomes a self-sizing themed slide with keyboard stepping and JSON sharing.",
  },
  {
    icon: IconPhoto,
    title: "Announcements and slides",
    body: "Combine pictures, clips and PDFs into a single deck. Put anything on air with one click, crossfade between cues, jump with keys 1–9, reorder freely — everything saves itself.",
  },
  {
    icon: IconLayoutBoard,
    title: "Animated themes, many outputs",
    body: "Craft everything from lower-thirds to full-screen layouts in the theme studio with motion gradients, then feed the sanctuary, stream and overflow each with its own look.",
  },
  {
    icon: IconClock,
    title: "Timer, notes and quiet updates",
    body: "A stopwatch plus countdown with lap log and red under-ten-seconds warning, sermon notes captured by themselves with export, and background updates that apply when you quit.",
  },
  {
    icon: IconPlug,
    title: "Fits your OBS & vMix rig",
    body: "Each content kind — passage, hymn, lyrics, timer, slides, blank — renders to full-resolution NDI. Slot Aleph into the production chain you already own.",
  },
  {
    icon: IconNotes,
    title: "Notes that write themselves",
    body: "Jot thoughts by hand or let live transcription draft them for you, with a preview list, a calm focus view and one-click JSON backup for moving machines.",
  },
  {
    icon: IconAdjustmentsHorizontal,
    title: "Calm control mid-service",
    body: "One Live panel switches passage, timer, lyrics, slides and blank. Step with the keyboard and walk verse ranges while keeping gaps like 1, 3, 5 intact.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-20 lg:py-[120px]"
    >
      <Container className="flex flex-col gap-10 md:gap-14">
        <Reveal>
          <SectionHeading
            id="features-heading"
            subtitle="Verse spotting plus the rest of the morning: hymns, lyrics, decks, notes and timing — styled once, live on all outputs through NDI."
          >
            A full toolkit for service day
          </SectionHeading>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 md:[&>*]:-ml-px md:[&>*]:-mt-px lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80} className="flex">
              <FeatureCard
                icon={f.icon}
                title={f.title}
                body={f.body}
                iconTone="accent"
              />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
