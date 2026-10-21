import React from "react";
import {
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../theme";
import { FONT_SERIF, FONT_UI } from "../fonts";
import { AppWindow } from "../components/AppWindow";
import { Stage } from "../components/Stage";
import { Chip, Headline, Kicker, Subline } from "../components/Text";
import { enter, range } from "../anim";

/**
 * Scene 3 — the core product moment: the transcript fills in, a reference is
 * detected, and the verse lands on the projector. Everything is driven by
 * fractions of the scene duration so the 90s and 30s cuts share one build.
 */
export const Hears: React.FC<{ footage?: boolean }> = ({ footage = false }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();

  const windowIn = range(frame, dur * 0.01, dur * 0.13);
  const typed = Math.round(
    range(frame, dur * (footage ? 0.08 : 0.16), dur * (footage ? 0.27 : 0.46), 0, 9),
  );
  const detection = range(frame, dur * 0.46, dur * 0.54);
  const fly = range(frame, dur * 0.56, dur * 0.68);
  const verse = range(frame, dur * 0.68, dur * 0.72);
  const live = range(frame, dur * 0.68, dur * 0.76);
  const waiting = 1 - range(frame, dur * 0.5, dur * 0.57);

  const flyX = 820 + (1350 - 820) * fly;
  const flyY = 760 + (548 - 760) * fly;
  const flyScale = 0.88 + Math.sin(fly * Math.PI) * 0.16 - fly * 0.48;
  const flyOpacity =
    range(frame, dur * 0.555, dur * 0.585) *
    (1 - range(frame, dur * 0.655, dur * 0.68));
  const trail = Math.sin(fly * Math.PI);

  return (
    <Stage intensity={0.5} vignette={0.5}>
      {/* Narrative column */}
      <div style={{ position: "absolute", left: 120, top: 148, width: 500 }}>
        <Kicker delay={dur * 0.06} color={COLORS.redSoft}>
          Live detection
        </Kicker>
        <Headline
          text="It hears. It finds."
          size={78}
          delay={dur * 0.09}
          stagger={5}
          width={330}
          accentLast
          style={{ marginTop: 20 }}
        />
        <Subline delay={dur * 0.2} size={26} style={{ marginTop: 22, maxWidth: 430 }}>
          Live transcription → instant verse detection
        </Subline>

        <div
          style={{
            marginTop: 38,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontFamily: FONT_UI,
            fontSize: 25,
            color: COLORS.ink,
          }}
        >
          <div style={{ ...enter(frame, dur * 0.32, 16), display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: COLORS.redBright }}>—</span> No typing.
          </div>
          <div style={{ ...enter(frame, dur * 0.37, 16), display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: COLORS.redBright }}>—</span> No searching.
          </div>
        </div>

        <div style={{ marginTop: 46, display: "flex", flexWrap: "wrap", gap: 12, maxWidth: 470 }}>
          <Chip icon="check" delay={dur * 0.72} tone="green">
            Auto-queued
          </Chip>
          <Chip icon="check" delay={dur * 0.78} tone="green">
            Works offline
          </Chip>
          <Chip icon="sparkles" delay={dur * 0.84} tone="red">
            20+ translations
          </Chip>
        </div>
      </div>

      {/* The app */}
      <div style={{ position: "absolute", left: 660, top: 218 }}>
        <AppWindow
          windowIn={windowIn}
          typed={typed}
          detection={detection}
          verse={verse}
          live={live}
          waiting={waiting}
        />
      </div>

      {/* Real service footage, trimmed 0:35–0:41, shown inside the window
          chrome for the first six seconds, then cut to the recreated UI.
          90s cut only. */}
      {footage && frame < dur / 3 ? (
        <div
          style={{
            position: "absolute",
            left: 660,
            top: 272,
            width: 1200,
            height: 636,
            overflow: "hidden",
            background: "#000",
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
            zIndex: 10,
          }}
        >
          <OffthreadVideo
            src={staticFile("sermon-live.mp4")}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : null}

      {/* Verse card flying from detection into the projector output */}
      <div
        style={{
          position: "absolute",
          left: flyX,
          top: flyY,
          width: 430,
          transform: `scale(${flyScale}) rotate(${-6 + fly * 4}deg)`,
          opacity: flyOpacity,
          zIndex: 20,
          pointerEvents: "none",
        }}
      >
        {trail > 0.05 ? (
          <div
            style={{
              position: "absolute",
              left: 30,
              right: 30,
              top: 40,
              height: 120,
              borderRadius: 18,
              background:
                "radial-gradient(closest-side, rgba(251,44,54,0.55), transparent)",
              filter: "blur(26px)",
              opacity: trail,
            }}
          />
        ) : null}
        <div
          style={{
            position: "relative",
            borderRadius: 14,
            border: `1px solid rgba(251,44,54,0.55)`,
            background: "linear-gradient(155deg, #1c1c22, #0a0a0d)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 50px rgba(220,38,38,0.2)",
            padding: "20px 22px",
          }}
        >
          <div
            style={{
              fontFamily: FONT_UI,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: COLORS.redSoft,
              marginBottom: 10,
            }}
          >
            ROMANS 8:28 · KJV
          </div>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 23,
              lineHeight: 1.38,
              color: COLORS.white,
            }}
          >
            And we know that all things work together for good to them that
            love God.
          </div>
        </div>
      </div>
    </Stage>
  );
};
