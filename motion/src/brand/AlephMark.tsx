import React from "react";
import { Img, staticFile } from "remotion";
import { COLORS } from "../theme";
import { FONT_UI } from "../fonts";

/**
 * The current Aleph app icon (public/aleph.svg): the Hebrew aleph in white on
 * the brand-red tile. Colour is baked into the artwork, so `color` is kept
 * only so existing call sites can stay unchanged.
 */
export const AlephMark: React.FC<{
  size?: number;
  color?: string;
  radius?: number;
  style?: React.CSSProperties;
}> = ({ size = 72, radius = 0, style }) => (
  <Img
    src={staticFile("aleph.svg")}
    style={{
      width: size,
      height: size,
      display: "block",
      borderRadius: radius,
      ...style,
    }}
  />
);

export const Wordmark: React.FC<{
  size?: number;
  color?: string;
  letterSpacing?: number;
  style?: React.CSSProperties;
}> = ({ size = 72, color = COLORS.white, letterSpacing = -0.02, style }) => (
  <span
    style={{
      fontFamily: FONT_UI,
      fontWeight: 500,
      fontSize: size,
      letterSpacing: `${letterSpacing}em`,
      color,
      lineHeight: 1,
      ...style,
    }}
  >
    Aleph
  </span>
);

export const LogoLockup: React.FC<{
  size?: number;
  gap?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ size = 72, gap = 22, color = COLORS.white, style }) => (
  <div style={{ display: "flex", alignItems: "center", gap, ...style }}>
    <AlephMark size={size} color={color} />
    <Wordmark size={size} color={color} />
  </div>
);
