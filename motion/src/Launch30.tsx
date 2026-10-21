import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Panic } from "./scenes/Panic";
import { Hears } from "./scenes/Hears";
import { Content } from "./scenes/Content";
import { CTA } from "./scenes/CTA";
import { CaptionTrack } from "./components/CaptionTrack";
import { CUTDOWN_CAPTIONS } from "./captions";

export const Launch30: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Sequence from={0} durationInFrames={180}>
      <Panic compact />
    </Sequence>
    <Sequence from={180} durationInFrames={300}>
      <Hears />
    </Sequence>
    <Sequence from={480} durationInFrames={240}>
      <Content />
    </Sequence>
    <Sequence from={720} durationInFrames={180}>
      <CTA />
    </Sequence>
    <CaptionTrack lines={CUTDOWN_CAPTIONS} />
  </AbsoluteFill>
);
