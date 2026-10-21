import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Panic } from "./scenes/Panic";
import { Meet } from "./scenes/Meet";
import { Hears } from "./scenes/Hears";
import { Content } from "./scenes/Content";
import { Beautiful } from "./scenes/Beautiful";
import { Volunteer } from "./scenes/Volunteer";
import { CTA } from "./scenes/CTA";
import { CaptionTrack } from "./components/CaptionTrack";
import { FILM_CAPTIONS } from "./captions";

const SCENES = [
  { from: 0, dur: 360, C: Panic },
  { from: 360, dur: 300, C: Meet },
  { from: 660, dur: 540, C: () => <Hears footage /> },
  { from: 1200, dur: 540, C: Content },
  { from: 1740, dur: 360, C: Beautiful },
  { from: 2100, dur: 360, C: Volunteer },
  { from: 2460, dur: 240, C: CTA },
] as const;

export const Launch90: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {SCENES.map(({ from, dur, C }) => (
      <Sequence key={from} from={from} durationInFrames={dur}>
        <C />
      </Sequence>
    ))}
    <CaptionTrack lines={FILM_CAPTIONS} />
  </AbsoluteFill>
);
