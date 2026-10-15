# Motion Assets — Aleph

Authentic artwork pulled straight from the app source for the product film
(see `../MOTION_DESIGN.md`). Nothing here was redrawn or reinterpreted.

## Brand

| File | Source in repo | Use |
| ---- | -------------- | --- |
| `aleph-mark.svg` | `web/public/brand/aleph-mark.svg` (byte-identical path) | The vector logomark. `fill="currentColor"` — tint it in your tool |
| `aleph-mark-white.svg` | Same path, fill set to `#FFFFFF` | White version for dark scenes / end card |
| `aleph-icon.svg` | `web/app/icon.svg` (byte-identical) | App icon: white mark on black rounded square |
| `aleph-lockup-white.svg` | Composed from the mark + the `AlephLogo` wordmark layout (`web/app/_components/ui/aleph-logo/`) | Full logo for title/end cards. Wordmark set in Inter Medium (fallback: Helvetica/Arial) |

> `public/aleph.svg` in the desktop app is only a wrapper around an
> embedded PNG, so it is **not** included here — use the true vectors above.
> Raster app icons (PNG/ICO/ICNS) live in `build-resources/icons/` if you
> need them.

## UI icons (`icons/`)

Server-rendered from the exact `lucide-react@1.40.0` package the app
ships, at 24×24, stroke 2 — pixel-identical to what users see on screen.
(Lucide is ISC licensed.)

| File | Used in the app for |
| ---- | ------------------- |
| `mic.svg` | Live transcription |
| `music.svg` | Lyrics panel |
| `book-open.svg` | Hymns panel |
| `presentation.svg` | Slides panel |
| `notebook-pen.svg` | Notes panel |
| `cast.svg` | Broadcast output |
| `palette.svg` | Theme designer |
| `radio.svg` | Remote control |
| `tv.svg` | Display mode |
| `brain-circuit.svg` | Speech AI / detection |
| `sparkles.svg` | AI features |
| `search.svg` | Search fields |
| `chevron-left.svg`, `chevron-right.svg` | Verse/slide navigation arrows |
| `check.svg`, `plus.svg`, `x.svg` | Actions |
| `play.svg` | Present / go-live |

All icons use `stroke="currentColor"` with no fill — tint freely.

## Brand colors

| Token | Value | Use |
| ----- | ----- | --- |
| Primary / accent red | `#dc2626` | CTAs, live indicators, glows (`rgba(220,38,38,…)` over black) |
| Background black | `#000000` | App dark theme, end cards |
| Foreground white | `#ffffff` | Text on dark |
| Muted gray | `#9aa4b2` | Secondary text in diagrams |

## Fonts

- **UI / wordmark:** Geist or Inter (wordmark weight: 500/medium)
- **Scripture on screen:** Source Serif 4

## Screen mockups (`screens/`)

Stylized 1280×720 recreations of the real app UI (dark theme, brand
accents, authentic copy) for scenes where recording the live app is
impractical. Recreate motion freely from these layouts.

| File | Shows |
| ---- | ----- |
| `screen-live.svg` | Full app window: icon rail, live transcript with a detected verse, live display (Romans 8:28), queue, search, detections |
| `screen-bible-verse.svg` | Projector-style fullscreen verse (John 3:16, KJV) |
| `screen-hymns.svg` | Hymns panel: search, Hymn E19 with Verse 1 / Chorus / Verse 2 stanzas |
| `screen-notes.svg` | Notes panel: note list plus the service-notes editor |
| `screen-lyrics.svg` | Lyrics slide: Amazing Grace verse with progress dots |
| `screen-slides.svg` | Slides panel: announcement thumbnails with "On screen" badge |
