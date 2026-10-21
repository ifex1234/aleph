import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { FONT_UI } from "../fonts";
import { Icon, type IconName } from "../brand/Icon";
import { ControlDeck } from "../components/ControlDeck";
import { Stage } from "../components/Stage";
import { Headline, Kicker, LiveDot, Subline } from "../components/Text";
import { enter, range } from "../anim";

const FLOW: { title: string; detail: string; icon: IconName; time: string }[] = [
  { title: "Romans 8:28", detail: "Verse · auto-detected", icon: "bookOpen", time: "10:41" },
  { title: "Amazing Grace", detail: "Chorus · advanced by tap", icon: "music", time: "10:47" },
  { title: "Youth Night", detail: "Announcement · queued", icon: "presentation", time: "10:52" },
];

const pulseAt = (frame: number, dur: number, center: number) => {
  const at = center * dur;
  return range(frame, at - 5, at) * (1 - range(frame, at + 2, at + 16));
};

/**
 * Scene 6 — the emotional turn. Same volunteer, now calm: one laptop runs the
 * whole service, and the walkthrough ticks over with two taps of Next.
 */
export const Volunteer: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();
  const u = frame / dur;

  const step = u < 0.38 ? 0 : u < 0.64 ? 1 : 2;
  const press = Math.max(pulseAt(frame, dur, 0.38), pulseAt(frame, dur, 0.64));
  const deckIn = range(frame, dur * 0.08, dur * 0.2);

  return (
    <Stage intensity={0.55} vignette={0.6}>
      <div style={{ position: "absolute", left: 120, top: 148, width: 720 }}>
        <Kicker delay={dur * 0.04} color={COLORS.redSoft}>
          Built for real volunteers
        </Kicker>
        <Headline
          text="Run the whole service from one laptop."
          size={66}
          delay={dur * 0.06}
          stagger={4}
          width={700}
          accentLast
          style={{ marginTop: 18 }}
        />
        <Subline delay={dur * 0.2} size={25} style={{ marginTop: 22, maxWidth: 560 }}>
          One operator. One app. Every screen.
        </Subline>

        <div
          style={{
            marginTop: 47,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 620,
          }}
        >
          {FLOW.map((item, i) => {
            const done = step > i;
            const active = step === i;
            return (
              <div
                key={item.title}
                style={{
                  ...enter(frame, dur * 0.26 + i * 7, 16),
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "15px 18px",
                  borderRadius: 13,
                  border: `1px solid ${active ? "rgba(251,44,54,0.4)" : COLORS.line}`,
                  background: active ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.02)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: done ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                  }}
                >
                  {done ? (
                    <Icon name="check" size={20} color={COLORS.green} />
                  ) : (
                    <Icon name={item.icon} size={20} color={active ? COLORS.redSoft : COLORS.muted} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: FONT_UI,
                      fontSize: 24,
                      fontWeight: 600,
                      color: COLORS.white,
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontFamily: FONT_UI, fontSize: 15, color: COLORS.faint }}>
                    {item.detail}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: FONT_UI, fontSize: 14, color: COLORS.faint }}>
                    {item.time}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      fontFamily: FONT_UI,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: done
                        ? COLORS.green
                        : active
                          ? COLORS.redSoft
                          : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {done ? "SHOWN" : active ? "ON SCREEN" : "QUEUED"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service control window */}
      <div
        style={{
          position: "absolute",
          right: 150,
          top: 122,
          opacity: deckIn,
          transform: `translateY(${(1 - deckIn) * 50}px) scale(${0.94 + deckIn * 0.06})`,
          filter: `blur(${(1 - deckIn) * 10}px)`,
        }}
      >
        <ControlDeck step={step} press={press} />
      </div>

      {/* Small reassurance badge above the control window */}
      <div
        style={{
          ...enter(frame, dur * 0.34, 16),
          position: "absolute",
          right: 194,
          top: 74,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "9px 14px",
          borderRadius: 999,
          border: `1px solid ${COLORS.line}`,
          background: "rgba(255,255,255,0.04)",
          fontFamily: FONT_UI,
          fontSize: 14,
          color: COLORS.muted,
        }}
      >
        <LiveDot size={7} />
        Connected · 2 screens
      </div>
    </Stage>
  );
};
