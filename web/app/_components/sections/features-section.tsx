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
    title: "AI verse detection, live",
    body: "Listens to sermon audio, transcribes in real time and surfaces verses from explicit references or paraphrased quotes. Operator stays in control — detections never clobber what's live.",
  },
  {
    icon: IconBook,
    title: "13,700+ hymns, fully offline",
    body: "Bundled hymnal with instant search by number, title, first line or any lyric. Click a stanza to present it live with words, music credits, key and meter.",
  },
  {
    icon: IconMusic,
    title: "Song lyrics that sing along",
    body: "Save songs with auto-detected Verse / Chorus / Bridge sections. Each stanza becomes an auto-fitting themed slide with keyboard stepping and JSON import/export.",
  },
  {
    icon: IconPhoto,
    title: "Slides for announcements",
    body: "Mix images, videos and PDFs in one deck. One-click to air, fade transitions, 1–9 direct cues, reorder and auto-save between restarts.",
  },
  {
    icon: IconLayoutBoard,
    title: "Living themes + multi-output NDI",
    body: "Design lower-thirds to fullscreen in the Theme Designer, animate gradients with motion, then route per-screen themes to sanctuary, stream and overflow.",
  },
  {
    icon: IconClock,
    title: "Timer, notes & auto-updates",
    body: "Stopwatch and countdown with lap times and pulsing red alerts, auto-captured sermon notes with export, and silent background updates that install on quit.",
  },
  {
    icon: IconPlug,
    title: "Works with OBS & vMix",
    body: "Every content type — verse, hymn, lyrics, timer, slides, blank — paints to NDI at full resolution. Drop it into your existing production setup.",
  },
  {
    icon: IconNotes,
    title: "Sermon notes that keep up",
    body: "Manual notes plus auto-capture from live transcription, with preview list, focus mode and one-click JSON backup to share between machines.",
  },
  {
    icon: IconAdjustmentsHorizontal,
    title: "Simple control during service",
    body: "Verse, timer, lyrics, slides and blank switcher in one Live panel. Keyboard-first stepping, verse-range navigation that preserves gaps like 1, 3, 5.",
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
            subtitle="Verse detection plus the rest of Sunday: hymns, lyrics, slides, notes and timer — themed once, live everywhere via NDI."
          >
            Everything your service needs
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
