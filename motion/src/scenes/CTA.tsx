import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { FONT_SERIF, FONT_UI } from "../fonts";
import { LogoLockup } from "../brand/AlephMark";
import { Icon } from "../brand/Icon";
import { Stage } from "../components/Stage";
import { pop, range } from "../anim";

const ArrowDown: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = COLORS.white,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v13" />
    <path d="M6 12l6 6 6-6" />
  </svg>
);

/**
 * Scene 7 — end card. One action, three platforms, no clutter.
 */
export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();

  const logo = range(frame, dur * 0.04, dur * 0.18);
  const tagline = range(frame, dur * 0.14, dur * 0.26);
  const button = pop(frame, dur * 0.26, 18);
  const platforms = range(frame, dur * 0.38, dur * 0.48);
  const domain = range(frame, dur * 0.44, dur * 0.54);
  const pulse = 1 + Math.sin(frame / 12) * 0.012;

  return (
    <Stage intensity={1} vignette={0.7} background="#080304">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 40,
        }}
      >
        <div
          style={{
            opacity: logo,
            transform: `scale(${0.94 + logo * 0.06})`,
            filter: `blur(${(1 - logo) * 16}px)`,
          }}
        >
          <LogoLockup size={92} gap={26} />
        </div>

        <div
          style={{
            marginTop: 26,
            fontFamily: FONT_SERIF,
            fontSize: 44,
            fontStyle: "italic",
            color: COLORS.white,
            opacity: tagline,
            transform: `translateY(${(1 - tagline) * 12}px)`,
            filter: `blur(${(1 - tagline) * 8}px)`,
          }}
        >
          The sermon, on screen.
        </div>

        <div
          style={{
            marginTop: 54,
            position: "relative",
            opacity: button.opacity,
            transform: button.transform,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -22,
              borderRadius: 999,
              background: "radial-gradient(closest-side, rgba(220,38,38,0.45), transparent)",
              filter: "blur(22px)",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "22px 38px",
              borderRadius: 16,
              background: COLORS.red,
              color: COLORS.white,
              fontFamily: FONT_UI,
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              boxShadow: "0 24px 60px rgba(220,38,38,0.35)",
              transform: `scale(${pulse})`,
            }}
          >
            <ArrowDown size={24} />
            Download free
          </div>
        </div>

        <div
          style={{
            marginTop: 30,
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: platforms,
            transform: `translateY(${(1 - platforms) * 10}px)`,
            fontFamily: FONT_UI,
            fontSize: 21,
            color: COLORS.muted,
          }}
        >
          <span>Windows</span>
          <span style={{ width: 4, height: 4, borderRadius: 99, background: COLORS.faint }} />
          <span>macOS</span>
          <span style={{ width: 4, height: 4, borderRadius: 99, background: COLORS.faint }} />
          <span>Linux</span>
        </div>

        <div
          style={{
            marginTop: 72,
            display: "flex",
            alignItems: "center",
            gap: 10,
            opacity: domain,
            fontFamily: FONT_UI,
            fontSize: 17,
            letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <Icon name="sparkles" size={16} color="rgba(255,255,255,0.45)" />
          aleph.zeravest.ng · local Whisper included · works offline
        </div>
      </div>
    </Stage>
  );
};
