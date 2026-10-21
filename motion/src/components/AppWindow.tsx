import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { FONT_SERIF, FONT_UI } from "../fonts";
import { Icon } from "../brand/Icon";
import { LiveDot } from "./Text";
import { range } from "../anim";

export const VerseCard: React.FC<{
  reference: string;
  text: string;
  width?: number;
  size?: number;
  align?: "left" | "center";
  style?: React.CSSProperties;
}> = ({ reference, text, width, size = 46, align = "center", style }) => (
  <div
    style={{
      width,
      textAlign: align,
      padding: "34px 40px",
      borderRadius: 16,
      border: `1px solid ${COLORS.line}`,
      background:
        "linear-gradient(160deg, rgba(24,24,28,0.92), rgba(8,8,10,0.96))",
      boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
      ...style,
    }}
  >
    <div
      style={{
        fontFamily: FONT_UI,
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: COLORS.redSoft,
        marginBottom: 18,
      }}
    >
      {reference}
    </div>
    <div
      style={{
        fontFamily: FONT_SERIF,
        fontSize: size,
        lineHeight: 1.34,
        color: COLORS.white,
        textWrap: "balance",
      }}
    >
      {text}
    </div>
  </div>
);

const WORDS = [
  "…as",
  "Paul",
  "writes",
  "in",
  "Romans",
  "chapter",
  "eight,",
  "verse",
  "twenty-eight…",
];

const HIGHLIGHT_FROM = 4;
const HIGHLIGHT_TO = 8;

/**
 * The app itself — recreated, not screenshotted, so the transcript and
 * output can animate. Layout mirrors the live screen: icon rail, transcript
 * with detection, projector output. Type sizes are raised from the real UI
 * for video legibility.
 */
export const AppWindow: React.FC<{
  windowIn: number;
  typed: number;
  detection: number;
  verse: number;
  live: number;
  waiting?: number;
  style?: React.CSSProperties;
}> = ({ windowIn, typed, detection, verse, live, waiting = 1, style }) => {
  const frame = useCurrentFrame();
  const caretOn = Math.floor(frame / 8) % 2 === 0;

  return (
    <div
      style={{
        width: 1200,
        height: 690,
        borderRadius: 18,
        background: "#0b0b0f",
        border: "1px solid rgba(255,255,255,0.13)",
        boxShadow:
          "0 50px 140px rgba(0,0,0,0.72), 0 0 0 1px rgba(0,0,0,0.5), 0 0 90px rgba(220,38,38,0.10)",
        overflow: "hidden",
        opacity: windowIn,
        transform: `translateY(${(1 - windowIn) * 44}px) scale(${
          0.965 + windowIn * 0.035
        })`,
        filter: `blur(${(1 - windowIn) * 12}px)`,
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
          padding: "0 22px",
          gap: 9,
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
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.ink,
          }}
        >
          Aleph — Sunday Service
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
          <LiveDot size={9} />
          <span
            style={{
              fontFamily: FONT_UI,
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.14em",
              color: COLORS.redSoft,
            }}
          >
            LIVE
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Icon rail */}
        <div
          style={{
            width: 70,
            flexShrink: 0,
            background: "#0e0e12",
            borderRight: `1px solid ${COLORS.line}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 22,
            gap: 26,
          }}
        >
          {(
            [
              ["mic", COLORS.redBright],
              ["music", COLORS.faint],
              ["bookOpen", COLORS.faint],
              ["presentation", COLORS.faint],
              ["cast", COLORS.faint],
            ] as const
          ).map(([name, color]) => (
            <div
              key={name}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  name === "mic" ? "rgba(220,38,38,0.14)" : "transparent",
              }}
            >
              <Icon name={name} size={22} color={color} />
            </div>
          ))}
        </div>

        {/* Transcript */}
        <div
          style={{
            width: 438,
            flexShrink: 0,
            borderRight: `1px solid ${COLORS.line}`,
            padding: "26px 28px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 22,
            }}
          >
            <span
              style={{
                fontFamily: FONT_UI,
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.white,
              }}
            >
              Transcript
            </span>
            <LiveDot size={8} />
          </div>

          <div
            style={{
              fontFamily: FONT_UI,
              fontSize: 24,
              lineHeight: 1.62,
              color: COLORS.white,
            }}
          >
            {WORDS.map((word, i) => {
              const spoken = i < typed;
              if (!spoken) return null;
              const isCurrent = i === typed - 1;
              const highlighted =
                detection > 0 && i >= HIGHLIGHT_FROM && i <= HIGHLIGHT_TO;
              return (
                <span
                  key={i}
                  style={{
                    color: highlighted
                      ? COLORS.white
                      : isCurrent
                        ? COLORS.white
                        : COLORS.muted,
                    background: highlighted
                      ? "rgba(220,38,38,0.16)"
                      : "transparent",
                    borderRadius: 5,
                    padding: highlighted ? "1px 3px" : 0,
                    marginRight: 7,
                    transition: "none",
                  }}
                >
                  {word}
                </span>
              );
            })}
            {typed > 0 && typed < WORDS.length ? (
              <span
                style={{
                  display: "inline-block",
                  width: 3,
                  height: 26,
                  marginLeft: 2,
                  verticalAlign: "-4px",
                  background: caretOn ? COLORS.redBright : "transparent",
                }}
              />
            ) : null}
          </div>

          {/* Detection card */}
          <div
            style={{
              marginTop: "auto",
              opacity: detection,
              transform: `translateY(${(1 - detection) * 26}px)`,
            }}
          >
            <div
              style={{
                borderRadius: 12,
                border: `1px solid rgba(251,44,54,0.5)`,
                background: "rgba(39,39,42,0.85)",
                padding: "16px 18px",
                boxShadow: "0 0 34px rgba(220,38,38,0.18)",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_UI,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  color: COLORS.redSoft,
                  marginBottom: 6,
                }}
              >
                SCRIPTURE DETECTED
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: 27,
                    fontWeight: 600,
                    color: COLORS.white,
                  }}
                >
                  Romans 8:28
                </span>
                <span
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.green,
                  }}
                >
                  98%
                </span>
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 12px",
                  borderRadius: 7,
                  background: COLORS.red,
                  fontFamily: FONT_UI,
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.white,
                }}
              >
                <Icon name="play" size={13} color={COLORS.white} />
                Present
              </div>
            </div>
          </div>
        </div>

        {/* Projector output */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#000" }}>
          <div
            style={{
              height: 56,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 26px",
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            <span
              style={{
                fontFamily: FONT_UI,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.16em",
                color: COLORS.muted,
              }}
            >
              PROJECTOR OUTPUT
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: FONT_UI,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: COLORS.muted,
                  padding: "4px 9px",
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 6,
                }}
              >
                KJV
              </span>
              <span
                style={{
                  fontFamily: FONT_UI,
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.faint,
                }}
              >
                AUTO-FIT
              </span>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 44,
              boxShadow: live > 0 ? `inset 0 0 0 2px rgba(251,44,54,${0.55 * live})` : "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(70% 70% at 50% 50%, rgba(220,38,38,${0.16 * live}), transparent 70%)`,
              }}
            />
            {verse > 0 ? (
              <div
                style={{
                  position: "relative",
                  opacity: verse,
                  transform: `scale(${0.97 + verse * 0.03})`,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    color: COLORS.redSoft,
                    marginBottom: 20,
                  }}
                >
                  ROMANS 8:28
                </div>
                <div
                  style={{
                    fontFamily: FONT_SERIF,
                    fontSize: 43,
                    lineHeight: 1.36,
                    color: COLORS.white,
                    textWrap: "balance",
                  }}
                >
                  And we know that all things work together for good to them
                  that love God.
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontFamily: FONT_UI,
                  fontSize: 22,
                  color: COLORS.faint,
                  border: `1px dashed ${COLORS.line}`,
                  borderRadius: 14,
                  padding: "28px 34px",
                  opacity: waiting,
                }}
              >
                Waiting for scripture…
              </div>
            )}
          </div>

          <div
            style={{
              height: 50,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 26px",
              borderTop: `1px solid ${COLORS.line}`,
              fontFamily: FONT_UI,
              fontSize: 15,
              color: COLORS.faint,
            }}
          >
            <span>Offline · On-device</span>
            <span style={{ opacity: range(verse, 0.5, 1) }}>
              {verse > 0 ? "1 / 1 · Auto-queued" : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
