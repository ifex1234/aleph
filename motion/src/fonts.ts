import { continueRender, delayRender, staticFile } from "remotion";

/**
 * Self-hosted brand fonts (latin subsets, variable). Bundling the files with
 * the project means headless Chrome never waits on a network font, which
 * previously fell back to Arial on some renders.
 */
const FACES = [
  { family: "Inter", style: "normal", weight: "100 900", file: "inter-latin.woff2" },
  { family: "Source Serif 4", style: "normal", weight: "200 900", file: "sourceserif-latin.woff2" },
  { family: "Source Serif 4", style: "italic", weight: "200 900", file: "sourceserif-italic-latin.woff2" },
] as const;

const css = FACES.map(
  (f) =>
    `@font-face{font-family:"${f.family}";font-style:${f.style};font-weight:${f.weight};font-display:block;src:url("${staticFile(`fonts/${f.file}`)}") format("woff2");}`,
).join("\n");

if (typeof document !== "undefined") {
  const handle = delayRender("Loading brand fonts");
  const el = document.createElement("style");
  el.setAttribute("data-aleph-fonts", "true");
  el.textContent = css;
  document.head.appendChild(el);

  Promise.all([
    document.fonts.load("400 32px Inter"),
    document.fonts.load("500 32px Inter"),
    document.fonts.load("600 32px Inter"),
    document.fonts.load("700 32px Inter"),
    document.fonts.load("400 32px 'Source Serif 4'"),
    document.fonts.load("500 32px 'Source Serif 4'"),
    document.fonts.load("600 32px 'Source Serif 4'"),
    document.fonts.load("italic 400 32px 'Source Serif 4'"),
  ])
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error("Font loading failed", err);
      continueRender(handle);
    });
}

export const FONT_UI = "Inter";
export const FONT_SERIF = "Source Serif 4";
