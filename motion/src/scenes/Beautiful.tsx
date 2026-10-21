import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { FONT_SERIF, FONT_UI } from "../fonts";
import { Stage } from "../components/Stage";
import { Headline, Kicker, LiveDot } from "../components/Text";
import { enter, range } from "../anim";

const THEMES = [
  { name: "Ember", bg: "linear-gradient(140deg, #7f1d1d, #dc2626 60%, #f97316)" },
  { name: "Midnight", bg: "linear-gradient(140deg, #0f172a, #1e3a8a 60%, #0b0b0f)" },
  { name: "Grace", bg: "linear-gradient(140deg, #3f2d20, #a16207 55%, #1c1917)" },
];

/**
 * Scene 5 — the design payoff. The output fills the frame, the lower third
 * slides in, and the NDI badge confirms this is broadcast-ready.
 */
export const Beautiful: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();

  const verseIn = range(frame, dur * 0.1, dur * 0.26);
  const lowerThird = range(frame, dur * 0.34, dur * 0.46);
  const ndi = range(frame, dur * 0.5, dur * 0.58);
  const themes = range(frame, dur * 0.44, dur * 0.56);
  const drift = Math.sin(frame / 90) * 8;

  return (
    <Stage intensity={1} vignette={0.62} background="#0a0405">
      {/* Bottom scrim keeps type legible over the gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 34%, transparent 55%)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${drift}px)` }}>
        {/* Verse on the living background */}
        <div
          style={{
            position: "absolute",
            left: 220,
            top: 300,
            width: 1080,
            textAlign: "center",
            opacity: verseIn,
            filter: `blur(${(1 - verseIn) * 14}px)`,
            transform: `translateY(${(1 - verseIn) * 26}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_UI,
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.72)",
              marginBottom: 26,
            }}
          >
            PSALM 23:1 · KJV
          </div>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 82,
              lineHeight: 1.24,
              color: COLORS.white,
              textWrap: "balance",
              textShadow: "0 24px 70px rgba(0,0,0,0.55)",
            }}
          >
            The LORD is my shepherd;
            <br />
            I shall not want.
          </div>
        </div>

        {/* Lower third */}
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 716,
            display: "flex",
            alignItems: "stretch",
            gap: 20,
            opacity: lowerThird,
            transform: `translateX(${(1 - lowerThird) * -40}px)`,
          }}
        >
          <div style={{ width: 6, borderRadius: 4, background: COLORS.redBright }} />
          <div style={{ paddingTop: 2 }}>
            <div
              style={{
                fontFamily: FONT_UI,
                fontSize: 38,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: COLORS.white,
              }}
            >
              Pastor Ada
            </div>
            <div
              style={{
                fontFamily: FONT_UI,
                fontSize: 19,
                color: "rgba(255,255,255,0.7)",
                marginTop: 6,
              }}
            >
              Romans 8:28 · KJV · auto-fitted
            </div>
          </div>
        </div>

        {/* Theme swatches */}
        <div
          style={{
            position: "absolute",
            right: 140,
            top: 706,
            display: "flex",
            gap: 16,
          }}
        >
          {THEMES.map((t, i) => (
            <div
              key={t.name}
              style={{
                ...enter(frame, dur * 0.44 + i * 5, 16),
                opacity: themes,
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 12,
                  background: t.bg,
                  border:
                    i === 0
                      ? `2px solid ${COLORS.white}`
                      : "1px solid rgba(255,255,255,0.18)",
                  boxShadow:
                    i === 0 ? "0 12px 34px rgba(0,0,0,0.5)" : "0 8px 22px rgba(0,0,0,0.4)",
                }}
              />
              <div
                style={{
                  marginTop: 9,
                  fontFamily: FONT_UI,
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.6)",
                  textAlign: "center",
                }}
              >
                {t.name}
              </div>
            </div>
          ))}
        </div>

        {/* NDI badge */}
        <div
          style={{
            position: "absolute",
            right: 140,
            top: 150,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 20px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.38)",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(14px)",
            opacity: ndi,
            transform: `translateY(${(1 - ndi) * -14}px)`,
          }}
        >
          <LiveDot size={8} />
          <span
            style={{
              fontFamily: FONT_UI,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: COLORS.white,
            }}
          >
            NDI OUTPUT
          </span>
          <span
            style={{
              fontFamily: FONT_UI,
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              paddingLeft: 12,
              borderLeft: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            1080p60
          </span>
        </div>
      </div>

      {/* Headline */}
      <div style={{ position: "absolute", left: 140, top: 150, width: 700 }}>
        <Kicker delay={dur * 0.04} color="rgba(255,255,255,0.65)">
          Looks like a design team
        </Kicker>
        <Headline
          text="Beautiful by default."
          size={68}
          delay={dur * 0.06}
          accentLast
          style={{ marginTop: 18 }}
        />
      </div>
    </Stage>
  );
};
