import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='260' height='260' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")";

type Blob = {
  color: string;
  size: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  period: number;
  phase: number;
};

const BLOBS: Blob[] = [
  {
    color: "rgba(220,38,38,0.62)",
    size: 1180,
    x: 0.18,
    y: 0.22,
    dx: 90,
    dy: 60,
    period: 340,
    phase: 0,
  },
  {
    color: "rgba(127,29,29,0.75)",
    size: 1400,
    x: 0.82,
    y: 0.72,
    dx: 120,
    dy: 80,
    period: 420,
    phase: 2.1,
  },
  {
    color: "rgba(251,44,54,0.28)",
    size: 760,
    x: 0.66,
    y: 0.14,
    dx: 70,
    dy: 110,
    period: 300,
    phase: 4.3,
  },
];

/**
 * Slow, living red field. Motion is deliberately almost imperceptible frame
 * to frame — the kind of background that feels alive only in aggregate.
 */
export const LivingGradient: React.FC<{
  intensity?: number;
  speed?: number;
  warmth?: number;
}> = ({ intensity = 1, speed = 1, warmth = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -200,
          background: `radial-gradient(120% 90% at 50% 110%, ${
            warmth > 0
              ? `rgba(120,20,20,${0.35 * intensity * warmth})`
              : "rgba(40,6,6,0.5)"
          }, transparent 60%)`,
        }}
      />
      {BLOBS.slice(0, intensity > 0.6 ? 3 : 2).map((b, i) => {
        const t = (frame / b.period) * Math.PI * 2 * speed + b.phase;
        const x = Math.cos(t) * b.dx;
        const y = Math.sin(t * 1.14) * b.dy;
        const scale = 1 + Math.sin(t * 0.8) * 0.08;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              width: b.size,
              height: b.size,
              marginLeft: -b.size / 2,
              marginTop: -b.size / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 50%, ${b.color}, transparent 68%)`,
              opacity: intensity,
              transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
              filter: "blur(70px)",
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * Shared stage: black base, living gradient, film grain, vignette.
 * Every scene sits on this so cuts feel like one continuous film.
 */
export const Stage: React.FC<{
  children: React.ReactNode;
  intensity?: number;
  grain?: number;
  vignette?: number;
  background?: string;
}> = ({
  children,
  intensity = 0.55,
  grain = 0.055,
  vignette = 0.55,
  background = COLORS.near,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background,
      overflow: "hidden",
      isolation: "isolate",
    }}
  >
    <LivingGradient intensity={intensity} />
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: grain,
        mixBlendMode: "overlay",
        backgroundImage: NOISE,
        backgroundSize: "260px 260px",
      }}
    />
    {children}
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(110% 90% at 50% 45%, transparent 40%, rgba(0,0,0,${vignette}) 100%)`,
      }}
    />
  </div>
);
