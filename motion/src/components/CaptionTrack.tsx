import React from "react";
import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { range } from "../anim";
import { FONT_UI } from "../fonts";
import { COLORS } from "../theme";

export type CaptionLine = { from: number; to: number; text: string };

const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inP = range(frame, 0, 8);
  const outP = range(frame, durationInFrames - 10, durationInFrames);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 250,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        paddingBottom: 74,
        background:
          "linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.42) 46%, transparent 100%)",
        opacity: inP * (1 - outP),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 18,
          maxWidth: 1180,
          padding: "6px 10px",
        }}
      >
        <span
          style={{
            width: 3,
            height: 40,
            marginTop: 6,
            borderRadius: 2,
            background: COLORS.red,
            flexShrink: 0,
          }}
        />
        <p
          style={{
            margin: 0,
            fontFamily: FONT_UI,
            fontSize: 33,
            lineHeight: 1.42,
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: "#f4f4f5",
            textAlign: "left",
            textShadow: "0 2px 18px rgba(0,0,0,0.75)",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
};

/**
 * Burned-in captions for the silent cut. One Sequence per line keeps each
 * line's fade independent and lets lines overlap slightly if needed.
 */
export const CaptionTrack: React.FC<{ lines: CaptionLine[] }> = ({ lines }) => (
  <>
    {lines.map((line) => (
      <Sequence
        key={`${line.from}-${line.text}`}
        from={line.from}
        durationInFrames={Math.max(1, line.to - line.from)}
      >
        <Caption text={line.text} />
      </Sequence>
    ))}
  </>
);
