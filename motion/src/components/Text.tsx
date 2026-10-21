import React from "react";
import { useCurrentFrame } from "remotion";
import { enter, range } from "../anim";
import { FONT_UI } from "../fonts";
import { COLORS } from "../theme";
import { Icon, type IconName } from "../brand/Icon";

export const Kicker: React.FC<{
  children: React.ReactNode;
  delay?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, color = COLORS.muted, style }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...enter(frame, delay, 16),
        fontFamily: FONT_UI,
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Word-by-word kinetic headline. Each word lifts and de-blurs 4 frames after
 * the one before it — enough stagger to feel authored, short enough to stay
 * snappy. The final word can carry the brand red.
 */
export const Headline: React.FC<{
  text: string;
  size?: number;
  delay?: number;
  stagger?: number;
  color?: string;
  accentLast?: boolean;
  accentColor?: string;
  weight?: number;
  width?: number;
  align?: "left" | "center";
  lineHeight?: number;
  letterSpacing?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  size = 84,
  delay = 0,
  stagger = 4,
  color = COLORS.white,
  accentLast = false,
  accentColor = COLORS.redBright,
  weight = 600,
  width,
  align = "left",
  lineHeight = 1.06,
  letterSpacing = -0.035,
  style,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <h1
      style={{
        fontFamily: FONT_UI,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing: `${letterSpacing}em`,
        color,
        margin: 0,
        width,
        textAlign: align,
        ...style,
      }}
    >
      {words.map((word, i) => {
        const p = range(frame, delay + i * stagger, delay + i * stagger + 16);
        const isAccent = accentLast && i === words.length - 1;
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${(1 - p) * 30}px)`,
              filter: `blur(${(1 - p) * 9}px)`,
              color: isAccent ? accentColor : color,
              whiteSpace: "pre",
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </h1>
  );
};

export const Subline: React.FC<{
  children: React.ReactNode;
  delay?: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, size = 30, color = COLORS.muted, style }) => {
  const frame = useCurrentFrame();
  return (
    <p
      style={{
        ...enter(frame, delay, 18),
        fontFamily: FONT_UI,
        fontSize: size,
        fontWeight: 400,
        lineHeight: 1.45,
        color,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </p>
  );
};

export const Chip: React.FC<{
  children: React.ReactNode;
  icon?: IconName;
  delay?: number;
  tone?: "default" | "red" | "green";
  style?: React.CSSProperties;
}> = ({ children, icon, delay = 0, tone = "default", style }) => {
  const frame = useCurrentFrame();
  const accent =
    tone === "red"
      ? COLORS.redSoft
      : tone === "green"
        ? COLORS.green
        : COLORS.muted;
  return (
    <div
      style={{
        ...enter(frame, delay, 14),
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 18px",
        borderRadius: 999,
        border: `1px solid ${
          tone === "red" ? "rgba(251,44,54,0.35)" : COLORS.line
        }`,
        background:
          tone === "red" ? "rgba(220,38,38,0.10)" : "rgba(255,255,255,0.04)",
        color: tone === "default" ? COLORS.ink : accent,
        fontFamily: FONT_UI,
        fontSize: 21,
        fontWeight: 500,
        ...style,
      }}
    >
      {icon ? <Icon name={icon} size={20} color={accent} /> : null}
      {children}
    </div>
  );
};

/** Small red dot that can pulse — the app's "live" motif. */
export const LiveDot: React.FC<{
  size?: number;
  color?: string;
  pulse?: boolean;
  style?: React.CSSProperties;
}> = ({ size = 10, color = COLORS.redBright, pulse = true, style }) => {
  const frame = useCurrentFrame();
  const glow = pulse ? 0.45 + 0.35 * Math.sin(frame / 9) : 0.6;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
        boxShadow: `0 0 ${size * 1.6}px rgba(251,44,54,${glow})`,
        display: "inline-block",
        ...style,
      }}
    />
  );
};
