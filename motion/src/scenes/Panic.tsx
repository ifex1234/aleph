import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { FONT_SERIF, FONT_UI } from "../fonts";
import { Icon } from "../brand/Icon";
import { Headline, LiveDot } from "../components/Text";
import { Stage } from "../components/Stage";
import { enter, range } from "../anim";

const FakeWindow: React.FC<{
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  opacity: number;
  children: React.ReactNode;
}> = ({ title, x, y, w, h, rot, opacity, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      transform: `rotate(${rot}deg)`,
      borderRadius: 12,
      overflow: "hidden",
      background: "#101014",
      border: "1px solid rgba(255,255,255,0.14)",
      boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
      opacity,
    }}
  >
    <div
      style={{
        height: 38,
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "0 13px",
        background: "#17171c",
        borderBottom: `1px solid ${COLORS.line}`,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 99, background: "#fb2c36" }} />
      <span style={{ width: 8, height: 8, borderRadius: 99, background: "#3a3a40" }} />
      <span style={{ width: 8, height: 8, borderRadius: 99, background: "#3a3a40" }} />
      <span
        style={{
          marginLeft: 8,
          fontFamily: FONT_UI,
          fontSize: 13,
          fontWeight: 500,
          color: COLORS.muted,
        }}
      >
        {title}
      </span>
    </div>
    <div style={{ padding: 14, height: h - 38 }}>{children}</div>
  </div>
);

const Bar: React.FC<{ w: number; h?: number; color?: string; style?: React.CSSProperties }> = ({
  w,
  h = 8,
  color = "rgba(255,255,255,0.12)",
  style,
}) => (
  <div style={{ width: w, height: h, borderRadius: 3, background: color, ...style }} />
);

const Cursor: React.FC<{ x: number; y: number; click: number }> = ({ x, y, click }) => (
  <div style={{ position: "absolute", left: x, top: y, zIndex: 30 }}>
    {click > 0 ? (
      <div
        style={{
          position: "absolute",
          left: -22,
          top: -22,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: `2px solid rgba(251,44,54,${click})`,
          transform: `scale(${1.6 - click * 0.6})`,
        }}
      />
    ) : null}
    <svg width="30" height="34" viewBox="0 0 24 28" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.6))" }}>
      <path d="M3 2l17 10.5-7.4 1.7L9.4 25z" fill="#ffffff" stroke="#000" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  </div>
);

/**
 * Scene 1 — the Sunday scramble. Real UI is never shown wrong on purpose;
 * this is a stylized collage of the three tools a volunteer is juggling.
 */
export const Panic: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();
  // The 30s cut gives this scene 6s instead of 12s, so the freeze and the
  // headline line come proportionally earlier — otherwise the line only
  // flashes before the cut.
  const freezeAt = dur * (compact ? 0.44 : 0.78);
  const headlineFrom = dur * (compact ? 0.5 : 0.8);
  const af = Math.min(frame, freezeAt);

  const winIn = (start: number) => range(af, start, start + dur * 0.09);
  const wrong = range(af, freezeAt * 0.78, freezeAt * 0.9);
  const freezeDim = range(frame, freezeAt, freezeAt + 18) * (compact ? 0.72 : 0.55);
  const shake =
    af >= freezeAt * 0.82 && af < freezeAt ? Math.sin(frame * 1.9) * 3 : 0;

  const cursorPoints: [number, number][] = [
    [960, 880],
    [470, 730],
    [1130, 700],
    [1540, 810],
    [760, 640],
  ];
  const p = range(af, dur * 0.1, dur * 0.72) * (cursorPoints.length - 1);
  const i = Math.min(cursorPoints.length - 2, Math.floor(p));
  const t = p - i;
  const cx = cursorPoints[i][0] + (cursorPoints[i + 1][0] - cursorPoints[i][0]) * t;
  const cy = cursorPoints[i][1] + (cursorPoints[i + 1][1] - cursorPoints[i][1]) * t;
  const clickAt = (ct: number) => {
    const start = ct * dur;
    return range(af, start, start + 4) * (1 - range(af, start + 4, start + 16));
  };
  const click = Math.max(clickAt(0.26), clickAt(0.48), clickAt(0.66));

  return (
    <Stage intensity={0.5} vignette={0.62}>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${shake}px)` }}>
        {/* Projector screen showing the wrong verse */}
        <div
          style={{
            ...enter(af, 0, 20),
            position: "absolute",
            left: 470,
            top: 150,
            width: 980,
            height: 552,
            borderRadius: 10,
            background: "#050506",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.7)",
            padding: 34,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.72,
          }}
        >
          <div
            style={{
              fontFamily: FONT_UI,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: COLORS.redSoft,
              marginBottom: 26,
            }}
          >
            LIVE · JOHN 3:16
          </div>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 54,
              lineHeight: 1.32,
              color: COLORS.white,
              textAlign: "center",
              maxWidth: 800,
              textWrap: "balance",
            }}
          >
            The LORD is my shepherd; I shall not want.
          </div>
          <div
            style={{
              marginTop: 26,
              fontFamily: FONT_UI,
              fontSize: 15,
              letterSpacing: "0.08em",
              color: COLORS.faint,
            }}
          >
            Psalm 23:1
          </div>

          <div
            style={{
              position: "absolute",
              top: 22,
              right: 22,
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(220,38,38,0.92)",
              opacity: wrong,
              transform: `scale(${0.9 + wrong * 0.1})`,
              fontFamily: FONT_UI,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: COLORS.white,
            }}
          >
            <Icon name="x" size={15} color={COLORS.white} />
            WRONG VERSE
          </div>
        </div>

        {/* Bible site */}
        <FakeWindow
          title="Bible website — 14 tabs"
          x={110}
          y={520}
          w={640}
          h={380}
          rot={-2}
          opacity={winIn(dur * 0.04)}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 7,
              background: "#1d1d23",
              fontFamily: FONT_UI,
              fontSize: 15,
              color: COLORS.muted,
            }}
          >
            <Icon name="search" size={15} color={COLORS.faint} />
            john 3:16
            <span style={{ width: 2, height: 18, background: COLORS.redBright, marginLeft: 2 }} />
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {["John 3:16 — For God so loved…", "1 John 3:16 — Hereby perceive we…", "John 3:1–6 — There was a man…"].map(
              (t, idx) => (
                <div
                  key={t}
                  style={{
                    padding: "9px 11px",
                    borderRadius: 6,
                    background: idx === 0 ? "rgba(220,38,38,0.16)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${idx === 0 ? "rgba(251,44,54,0.4)" : "transparent"}`,
                    fontFamily: FONT_UI,
                    fontSize: 13,
                    color: idx === 0 ? COLORS.white : COLORS.faint,
                  }}
                >
                  {t}
                </div>
              )
            )}
          </div>
        </FakeWindow>

        {/* Slides */}
        <FakeWindow
          title="Slides — 3 decks open"
          x={760}
          y={505}
          w={540}
          h={310}
          rot={1.4}
          opacity={winIn(dur * 0.1)}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[0, 1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  height: 86,
                  borderRadius: 6,
                  background: n === 1 ? "rgba(220,38,38,0.18)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${n === 1 ? "rgba(251,44,54,0.45)" : COLORS.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT_UI,
                  fontSize: 12,
                  color: COLORS.faint,
                }}
              >
                Slide {n + 1}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontFamily: FONT_UI, fontSize: 12, color: COLORS.faint }}>
            Which file was it again?
          </div>
        </FakeWindow>

        {/* OBS */}
        <FakeWindow
          title="OBS — streaming"
          x={1270}
          y={590}
          w={560}
          h={310}
          rot={-1.2}
          opacity={winIn(dur * 0.16)}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {["Scene", "Camera", "Overlay", "Lower third"].map((s, n) => (
                <div
                  key={s}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 5,
                    fontFamily: FONT_UI,
                    fontSize: 12,
                    color: n === 0 ? COLORS.white : COLORS.faint,
                    background: n === 0 ? "rgba(255,255,255,0.07)" : "transparent",
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
            <div
              style={{
                flex: 1.5,
                borderRadius: 6,
                background: "#050506",
                border: "1px solid rgba(251,44,54,0.35)",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_UI,
                  fontSize: 12,
                  color: COLORS.redSoft,
                  letterSpacing: "0.12em",
                }}
              >
                LIVE
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Bar w={90} h={7} />
            <Bar w={54} h={7} />
            <Bar w={120} h={7} color="rgba(251,44,54,0.5)" />
          </div>
        </FakeWindow>

        {/* Volunteer's cursor */}
        <Cursor x={cx} y={cy} click={click} />

        {/* Time + status */}
        <div
          style={{
            position: "absolute",
            left: 96,
            top: 78,
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontFamily: FONT_UI,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 600, color: COLORS.white }}>9:58 AM</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "8px 13px",
              borderRadius: 999,
              border: `1px solid rgba(251,44,54,0.35)`,
              background: "rgba(220,38,38,0.10)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: COLORS.redSoft,
            }}
          >
            <LiveDot size={7} />
            SERVICE IN PROGRESS
          </span>
        </div>
      </div>

      {/* Freeze frame + line */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(0,0,0,${freezeDim * 0.9})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 120px",
        }}
      >
        <Headline
          text="Sunday mornings shouldn't feel like this."
          size={compact ? 70 : 82}
          delay={headlineFrom}
          stagger={compact ? 3 : 5}
          width={1280}
          align="center"
          accentLast
          style={{ textShadow: "0 20px 60px rgba(0,0,0,0.8)" }}
        />
      </div>
    </Stage>
  );
};
