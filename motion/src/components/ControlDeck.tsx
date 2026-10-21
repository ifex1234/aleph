import React from "react";
import { COLORS } from "../theme";
import { FONT_SERIF, FONT_UI } from "../fonts";
import { Icon, type IconName } from "../brand/Icon";
import { LiveDot } from "./Text";

const STEPS: {
  label: string;
  detail: string;
  icon: IconName;
  preview: string;
}[] = [
  {
    label: "Romans 8:28",
    detail: "Verse · KJV",
    icon: "bookOpen",
    preview: "And we know that all things work together for good to them that love God.",
  },
  {
    label: "Amazing Grace",
    detail: "Chorus · 4 lines",
    icon: "music",
    preview: "Amazing grace, how sweet the sound, that saved a wretch like me.",
  },
  {
    label: "Youth Night",
    detail: "Announcement · Friday",
    icon: "presentation",
    preview: "Youth Night · Friday, 6:00 PM · Main Hall",
  },
];

/**
 * The desktop service-control window. Replaces the old phone remote: Aleph
 * runs on the operator's laptop, so the film shows the laptop, not a phone.
 * `step` is the item currently on screen; `press` squashes Next for feedback.
 */
export const ControlDeck: React.FC<{
  step: number;
  press?: number;
  style?: React.CSSProperties;
}> = ({ step, press = 0, style }) => (
  <div
    style={{
      width: 620,
      borderRadius: 20,
      background: "#0b0b0f",
      border: "1px solid rgba(255,255,255,0.14)",
      boxShadow:
        "0 60px 140px rgba(0,0,0,0.75), 0 0 90px rgba(220,38,38,0.13), inset 0 1px 0 rgba(255,255,255,0.06)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    {/* Chrome */}
    <div
      style={{
        height: 54,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "0 20px",
        borderBottom: `1px solid ${COLORS.line}`,
        background: "#111116",
        position: "relative",
      }}
    >
      <span style={{ width: 11, height: 11, borderRadius: 99, background: "#fb2c36" }} />
      <span style={{ width: 11, height: 11, borderRadius: 99, background: "#3a3a40" }} />
      <span style={{ width: 11, height: 11, borderRadius: 99, background: "#3a3a40" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_UI,
          fontSize: 17,
          fontWeight: 600,
          color: COLORS.ink,
        }}
      >
        Aleph — Service Control
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <LiveDot size={8} />
        <span
          style={{
            fontFamily: FONT_UI,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: COLORS.redSoft,
          }}
        >
          ON AIR
        </span>
      </div>
    </div>

    <div style={{ padding: "22px 22px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      {/* On screen preview */}
      <div
        style={{
          borderRadius: 14,
          border: `1px solid rgba(251,44,54,0.45)`,
          background:
            "linear-gradient(150deg, rgba(220,38,38,0.14), rgba(10,10,13,0.92))",
          padding: "16px 18px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: FONT_UI,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: COLORS.redSoft,
            }}
          >
            ON SCREEN
          </span>
          <span
            style={{
              fontFamily: FONT_UI,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: COLORS.muted,
              padding: "3px 8px",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 5,
            }}
          >
            KJV · AUTO-FIT
          </span>
        </div>
        <div
          style={{
            fontFamily: FONT_UI,
            fontSize: 24,
            fontWeight: 600,
            color: COLORS.white,
          }}
        >
          {STEPS[step].label}
        </div>
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 19,
            lineHeight: 1.44,
            color: COLORS.muted,
            marginTop: 9,
          }}
        >
          {STEPS[step].preview}
        </div>
      </div>

      {/* Queue */}
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderRadius: 11,
                border: `1px solid ${active ? "rgba(251,44,54,0.5)" : COLORS.line}`,
                background: active ? "rgba(220,38,38,0.10)" : "rgba(255,255,255,0.025)",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: active ? "rgba(220,38,38,0.16)" : "rgba(255,255,255,0.05)",
                }}
              >
                <Icon
                  name={s.icon}
                  size={17}
                  color={active ? COLORS.redSoft : COLORS.muted}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: 17,
                    fontWeight: 600,
                    color: done || active ? COLORS.white : COLORS.muted,
                  }}
                >
                  {s.label}
                </div>
                <div style={{ fontFamily: FONT_UI, fontSize: 12, color: COLORS.faint }}>
                  {s.detail}
                </div>
              </div>
              {done ? (
                <Icon name="check" size={17} color={COLORS.green} />
              ) : active ? (
                <span
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: COLORS.redSoft,
                  }}
                >
                  ON SCREEN
                </span>
              ) : (
                <Icon name="chevronRight" size={16} color={COLORS.faint} />
              )}
            </div>
          );
        })}
      </div>

      {/* Next button */}
      <div style={{ marginTop: "auto", paddingTop: 18 }}>
        <div
          style={{
            height: 58,
            borderRadius: 14,
            background: COLORS.red,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontFamily: FONT_UI,
            fontSize: 20,
            fontWeight: 600,
            color: COLORS.white,
            boxShadow: "0 18px 40px rgba(220,38,38,0.35)",
            transform: `scale(${1 - press * 0.045})`,
          }}
        >
          Next
          <Icon name="chevronRight" size={21} color={COLORS.white} />
        </div>
        <div
          style={{
            marginTop: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            fontFamily: FONT_UI,
            fontSize: 12,
            color: COLORS.faint,
          }}
        >
          <span>Space · Next</span>
          <span style={{ width: 3, height: 3, borderRadius: 99, background: COLORS.faint }} />
          <span>NDI 1080p60</span>
          <span style={{ width: 3, height: 3, borderRadius: 99, background: COLORS.faint }} />
          <span>2 screens connected</span>
        </div>
      </div>
    </div>
  </div>
);
