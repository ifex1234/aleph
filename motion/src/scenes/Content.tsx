import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, PROJECTOR } from "../theme";
import { FONT_SERIF, FONT_UI } from "../fonts";
import { Icon, type IconName } from "../brand/Icon";
import { Stage } from "../components/Stage";
import { Headline, Kicker, LiveDot } from "../components/Text";
import { range } from "../anim";

type Chapter = {
  key: string;
  label: string;
  detail: string;
  icon: IconName;
  footer: string;
};

const CHAPTERS: Chapter[] = [
  { key: "verses", label: "Verses", detail: "Any translation", icon: "bookOpen", footer: "Auto-fit · never overflows" },
  { key: "lyrics", label: "Lyrics", detail: "Verse by verse", icon: "music", footer: "Advance lines, not slides" },
  { key: "hymns", label: "Hymns", detail: "13,700+ offline", icon: "notebookPen", footer: "Search, transpose, project" },
  { key: "slides", label: "Slides", detail: "Images · video · PDF", icon: "presentation", footer: "Everything in one deck" },
];

const Frame: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "78px 84px 64px",
      ...style,
    }}
  >
    {children}
  </div>
);

const Verses: React.FC = () => (
  <Frame>
    <div
      style={{
        fontFamily: FONT_UI,
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: "0.2em",
        color: COLORS.redSoft,
        marginBottom: 30,
      }}
    >
      JOHN 3:16 · KJV
    </div>
    <div
      style={{
        fontFamily: FONT_SERIF,
        fontSize: 58,
        lineHeight: 1.32,
        color: COLORS.white,
        textAlign: "center",
        textWrap: "balance",
        maxWidth: 820,
      }}
    >
      For God so loved the world, that he gave his only begotten Son.
    </div>
    <div
      style={{
        marginTop: 34,
        fontFamily: FONT_UI,
        fontSize: 17,
        color: COLORS.faint,
        letterSpacing: "0.06em",
      }}
    >
      1 / 1 · Auto-queued
    </div>
  </Frame>
);

const Lyrics: React.FC = () => (
  <Frame>
    <div
      style={{
        fontFamily: FONT_UI,
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: "0.2em",
        color: COLORS.redSoft,
        marginBottom: 16,
      }}
    >
      AMAZING GRACE · VERSE 2
    </div>
    <div
      style={{
        fontFamily: FONT_SERIF,
        fontSize: 52,
        lineHeight: 1.42,
        color: COLORS.white,
        textAlign: "center",
        textWrap: "balance",
        maxWidth: 800,
      }}
    >
      ’Twas grace that taught my heart to fear,
      <br />
      and grace my fears relieved.
    </div>
    <div style={{ display: "flex", gap: 10, marginTop: 38 }}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: i === 1 ? 34 : 10,
            height: 10,
            borderRadius: 99,
            background: i === 1 ? COLORS.redBright : "rgba(255,255,255,0.18)",
          }}
        />
      ))}
    </div>
  </Frame>
);

const Hymns: React.FC = () => (
  <Frame>
    <div
      style={{
        fontFamily: FONT_UI,
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: "0.2em",
        color: COLORS.redSoft,
        marginBottom: 16,
      }}
    >
      HYMN E19 · VERSE 1
    </div>
    <div
      style={{
        fontFamily: FONT_SERIF,
        fontSize: 48,
        lineHeight: 1.46,
        color: COLORS.white,
        textAlign: "center",
        textWrap: "balance",
        maxWidth: 820,
      }}
    >
      Amazing love! How can it be
      <br />
      that Thou, my God, shouldst die for me?
    </div>
    <div
      style={{
        marginTop: 34,
        display: "flex",
        gap: 10,
        padding: "9px 15px",
        borderRadius: 999,
        border: `1px solid ${COLORS.line}`,
        fontFamily: FONT_UI,
        fontSize: 15,
        color: COLORS.muted,
      }}
    >
      <Icon name="check" size={16} color={COLORS.green} />
      13,700+ hymns · available offline
    </div>
  </Frame>
);

const Slides: React.FC = () => (
  <Frame style={{ padding: "54px 64px" }}>
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        background:
          "linear-gradient(140deg, rgba(220,38,38,0.55), rgba(80,10,10,0.9) 55%, rgba(10,10,12,0.98))",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(70% 70% at 20% 20%, rgba(255,255,255,0.16), transparent 60%)",
        }}
      />
      <div
        style={{
          position: "relative",
          fontFamily: FONT_UI,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "0.24em",
          color: "rgba(255,255,255,0.75)",
        }}
      >
        YOU'RE INVITED
      </div>
      <div
        style={{
          position: "relative",
          fontFamily: FONT_UI,
          fontSize: 74,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: COLORS.white,
          marginTop: 14,
        }}
      >
        Sunday Service
      </div>
      <div
        style={{
          position: "relative",
          fontFamily: FONT_UI,
          fontSize: 22,
          color: "rgba(255,255,255,0.82)",
          marginTop: 12,
        }}
      >
        10:00 AM · Main Hall
      </div>
    </div>
  </Frame>
);

const PANELS: Record<string, React.FC> = {
  verses: Verses,
  lyrics: Lyrics,
  hymns: Hymns,
  slides: Slides,
};

/**
 * Scene 4 — one app, every content type. Four chapters, equal weight, each
 * landing in the same projector frame so the idea reads instantly.
 */
export const Content: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();
  const u = frame / dur;
  const per = dur / 4;
  const idx = Math.min(3, Math.floor(u * 4));
  const lf = frame - idx * per;
  const chapter = CHAPTERS[idx];
  const Panel = PANELS[chapter.key];

  const enterP = range(lf, 0, per * 0.16);
  const exitP = range(lf, per * 0.88, per);
  const contentStyle: React.CSSProperties = {
    opacity: enterP * (1 - exitP),
    transform: `scale(${0.975 + enterP * 0.025 - exitP * 0.01}) translateY(${(1 - enterP) * 20}px)`,
    filter: `blur(${(1 - enterP) * 8 + exitP * 5}px)`,
  };

  return (
    <Stage intensity={0.42} vignette={0.55}>
      <div style={{ position: "absolute", left: 120, top: 96, width: 680 }}>
        <Kicker delay={0} color={COLORS.redSoft}>
          One workflow
        </Kicker>
        <Headline
          text="One app. Every screen."
          size={68}
          delay={4}
          accentLast
          style={{ marginTop: 16 }}
        />
      </div>

      {/* Chapter rail */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 300,
          width: 540,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {CHAPTERS.map((c, i) => {
          const active = i === idx;
          return (
            <div
              key={c.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 18px",
                borderRadius: 14,
                border: `1px solid ${active ? "rgba(251,44,54,0.45)" : "transparent"}`,
                background: active ? "rgba(220,38,38,0.09)" : "rgba(255,255,255,0.015)",
                opacity: active ? 1 : 0.58,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: active ? "rgba(220,38,38,0.16)" : "rgba(255,255,255,0.05)",
                }}
              >
                <Icon name={c.icon} size={23} color={active ? COLORS.redSoft : COLORS.muted} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: 27,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: active ? COLORS.white : COLORS.muted,
                  }}
                >
                  {c.label}
                </div>
                <div style={{ fontFamily: FONT_UI, fontSize: 15, color: COLORS.faint }}>
                  {c.detail}
                </div>
              </div>
              {active ? <LiveDot size={8} /> : null}
            </div>
          );
        })}

        <div
          style={{
            marginTop: 18,
            height: 2,
            width: "100%",
            background: "rgba(255,255,255,0.08)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div style={{ width: `${u * 100}%`, height: "100%", background: COLORS.red }} />
        </div>
      </div>

      {/* Projector */}
      <div
        style={{
          position: "absolute",
          left: PROJECTOR.x,
          top: PROJECTOR.y,
          width: PROJECTOR.w,
          height: PROJECTOR.h,
          borderRadius: 18,
          background: "#050506",
          border: `1px solid ${COLORS.lineStrong}`,
          boxShadow:
            "0 50px 120px rgba(0,0,0,0.65), 0 0 90px rgba(220,38,38,0.12)",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, ...contentStyle, overflow: "hidden", borderRadius: 18 }}>
          <Panel />
        </div>

        <div
          style={{
            position: "absolute",
            left: 22,
            top: 18,
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontFamily: FONT_UI,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.16em",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <LiveDot size={6} />
          PROJECTOR OUTPUT
        </div>
        <div
          style={{
            position: "absolute",
            right: 22,
            bottom: 16,
            fontFamily: FONT_UI,
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          {chapter.footer}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: PROJECTOR.x,
          top: PROJECTOR.y + PROJECTOR.h + 25,
          fontFamily: FONT_UI,
          fontSize: 17,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLORS.faint,
        }}
      >
        {chapter.label} · {chapter.detail}
      </div>
    </Stage>
  );
};
