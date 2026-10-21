import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { FONT_SERIF, FONT_UI } from "../fonts";
import { AlephMark, Wordmark } from "../brand/AlephMark";
import { Stage } from "../components/Stage";
import { range } from "../anim";

/**
 * Scene 2 — the reveal. The mark resolves out of light and the name settles
 * in; no bounce, no spin, just a confident resolve.
 */
export const Meet: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();

  const markIn = range(frame, dur * 0.05, dur * 0.22);
  const ring = range(frame, dur * 0.08, dur * 0.3);
  const wordIn = range(frame, dur * 0.24, dur * 0.4);
  const kicker = range(frame, dur * 0.42, dur * 0.52);
  const tagline = range(frame, dur * 0.56, dur * 0.68);
  const out = range(frame, dur * 0.94, dur);

  const glow = 0.35 + Math.sin(frame / 16) * 0.06;

  return (
    <Stage intensity={0.45} vignette={0.68}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${1 - out * 0.03})`,
          opacity: 1 - out,
        }}
      >
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Expanding ring */}
          <div
            style={{
              position: "absolute",
              top: -40,
              left: "50%",
              width: 300,
              height: 300,
              marginLeft: -150,
              borderRadius: "50%",
              border: `1px solid rgba(251,44,54,${0.5 * (1 - ring)})`,
              transform: `scale(${0.5 + ring * 2.4})`,
            }}
          />
          {/* Soft light behind the mark */}
          <div
            style={{
              position: "absolute",
              top: -170,
              left: "50%",
              width: 620,
              height: 620,
              marginLeft: -310,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(220,38,38,${glow}), transparent 66%)`,
              filter: "blur(30px)",
            }}
          />

          <div
            style={{
              opacity: markIn,
              transform: `scale(${1.35 - markIn * 0.35})`,
              filter: `blur(${(1 - markIn) * 22}px)`,
              marginBottom: 34,
            }}
          >
            <AlephMark size={168} color={COLORS.white} />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Wordmark
              size={118}
              letterSpacing={0.55 - wordIn * 0.57}
              style={{
                opacity: wordIn,
                filter: `blur(${(1 - wordIn) * 16}px)`,
                transform: `translateY(${(1 - wordIn) * 14}px)`,
              }}
            />
          </div>

          <div
            style={{
              marginTop: 26,
              fontFamily: FONT_UI,
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: COLORS.muted,
              opacity: kicker,
              transform: `translateY(${(1 - kicker) * 12}px)`,
            }}
          >
            The presentation app that listens
          </div>
        </div>

        <div
          style={{
            marginTop: 58,
            fontFamily: FONT_SERIF,
            fontSize: 46,
            fontStyle: "italic",
            color: COLORS.white,
            opacity: tagline,
            transform: `translateY(${(1 - tagline) * 14}px)`,
            filter: `blur(${(1 - tagline) * 8}px)`,
          }}
        >
          The sermon, on screen.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: COLORS.black,
          opacity: range(frame, dur * 0.95, dur),
          pointerEvents: "none",
        }}
      />
    </Stage>
  );
};
