# Aleph — Motion Design Narration Script

> A 90-second product film for Aleph: the AI-powered Bible presentation app
> for churches and live gatherings.
> Format: 16:9 landscape · Voiceover + kinetic type + screen capture ·
> Music: warm, modern worship-electronic, builds to a confident resolve.

---

## Logline

The preacher says it — Aleph shows it. An AI presentation app that listens
to the sermon, finds the verse before the sentence ends, and puts beautiful,
readable scripture on screen. No scrambling. No wrong verses. No stress.

## Target viewer

Church media volunteers, pastors, and worship teams — especially small teams
where one person runs sound, slides, and livestream at the same time.

---

## Scene breakdown

### Scene 1 — The Sunday scramble (0:00–0:12)

**Visual:** Dark stage. A nervous volunteer at a laptop. The preacher says
"Turn with me to…", the volunteer frantically tabs between a Bible website,
PowerPoint, and OBS. Wrong verse flashes on the projector. Congregation
glances around.

**On-screen text:** "Sunday mornings shouldn't feel like this."

**VO:**
> It's Sunday morning. The preacher calls a verse — and your heart skips a
> beat. Three apps open, a hundred tabs, and a congregation waiting on you
> to find John chapter three, verse sixteen… before the moment passes.

### Scene 2 — Meet Aleph (0:12–0:22)

**Visual:** The chaos freezes. The Aleph logo assembles from light. Clean
dashboard fades in: transcript panel, live preview, verse queue.

**On-screen text:** "Meet Aleph."

**VO:**
> Meet Aleph — the presentation app that listens. It hears the sermon,
> understands it, and drives your screens for you.

### Scene 3 — It hears, it finds (0:22–0:40)

**Visual:** Screen capture, stylized: live transcript types out in real
time as a voice says "…as Paul writes in Romans chapter eight, verse
twenty-eight…" The words light up; the verse card flies into the live
output. Split screen: preacher speaking / verse appearing instantly.

**On-screen text:** "Live transcription → instant verse detection"

**VO:**
> As the message is preached, Aleph transcribes every word and detects
> every scripture reference — automatically. No typing. No searching.
> The verse is on screen before the sentence is even finished — in over
> twenty translations, even when the internet drops.

### Scene 4 — One app, every content type (0:40–0:58)

**Visual:** Fast, rhythmic cards flipping: a Bible passage → song lyrics
with verse-by-verse navigation → a 13,000-hymn library opening on a stanza
→ announcement slides (image, video, PDF). Each lands perfectly framed on
a glowing projector screen.

**On-screen text:** "Verses · Lyrics · Hymns · Slides"

**VO:**
> Verses, song lyrics, thirteen thousand hymns, announcement slides —
> images, video, even PDFs. One app, one laptop, one calm operator.
> Every line auto-fits the screen, so nothing ever overflows or gets cut.

### Scene 5 — Beautiful by default (0:58–1:10)

**Visual:** Theme Designer montage: gradient backgrounds begin to slowly
rotate and glow — motion backgrounds come alive. Fonts, shadows, lower
thirds, and an NDI feed badge pulse on.

**On-screen text:** "Motion themes · NDI output"

**VO:**
> And it looks like a design team made it. Animated gradient backgrounds,
> custom themes, and broadcast-grade NDI output for your livestream —
> designed once, beautiful everywhere.

### Scene 6 — Built for real volunteers (1:10–1:22)

**Visual:** Back to the volunteer — now relaxed, coffee in hand, tapping
"next" in the service-control window on the operator laptop. The service
flows: verse, chorus, announcement. Congregation engaged.

**On-screen text:** "Run the whole service from one laptop."

**VO:**
> Aleph was built for real church life: volunteers, not video engineers.
> Run it from one laptop — and keep your eyes on the room, not the screen —
> with the confidence that what's on screen is right, because Aleph heard it too.

### Scene 7 — Call to action (1:22–1:30)

**Visual:** Logo lockup on a living gradient. Download buttons animate in.

**On-screen text:** "Aleph — the sermon, on screen. Download free."

**VO:**
> Aleph. The sermon, on screen. Download free today.

---

## 30-second cutdown

| Time | Visual | VO |
| ---- | ------ | -- |
| 0:00–0:06 | Volunteer panic, wrong verse on screen | "The preacher calls a verse — and Sunday morning holds its breath." |
| 0:06–0:16 | Transcript lighting up, verse flying live | "Aleph listens to the sermon and puts every verse on screen. Automatically." |
| 0:16–0:24 | Rapid cards: lyrics, hymns, slides, motion theme | "Verses, lyrics, hymns, slides — always framed, always beautiful." |
| 0:24–0:30 | Logo on living gradient | "Aleph. The sermon, on screen. Download free." |

## Tagline options

1. The sermon, on screen.
2. Never miss a verse again.
3. One calm operator. Every screen covered.

---

## What makes Aleph unique (pillars for the edit)

1. **It listens.** Live transcription + AI verse detection means the app
   follows the preacher instead of the operator chasing the preacher.
2. **Offline-first.** Full Bible text, hymns, and search live on-device —
   a dead church Wi-Fi can't break the service.
3. **Everything in one place.** Scripture, songs, a 13,000-hymn library,
   and media slides share one remote, one live output, one workflow.
4. **Broadcast-grade, volunteer-simple.** NDI output, motion themes, and
   phone remote control without a learning cliff.

## Real-life problems it solves

- **The scramble:** no more alt-tabbing between a Bible site, PowerPoint,
  and streaming software mid-sermon.
- **The wrong verse:** detection + preview means what the congregation
  sees is verified before it goes live.
- **The one-person team:** a single volunteer can run lyrics, scripture,
  and announcements from a phone while sitting with their family.
- **The overflow embarrassment:** auto-fitting text and motion themes keep
  every screen polished with zero design skill.
- **The dead Wi-Fi Sunday:** everything essential works fully offline.

---

## Asset checklist for the motion designer

- [x] Authentic artwork in `motion-assets/` (see its README): vector
      logomark (color + white), app icon, white logo lockup, and 18 UI
      icons server-rendered from the app's exact lucide-react build
- [x] 16:9 **done film + cutdown rendered** — implemented as code in
      `motion/` (Remotion). The app UI is rebuilt in React and animated;
      Scene 3 of the 90s film also cuts in six seconds of real transcription
      footage (0:35–0:41 of the live recording, trimmed to
      `motion/public/sermon-live.mp4`). Captions are burned in from the
      script below for the silent cut.
      - `bun install && bun run render:90` → `motion/out/aleph-launch-90.mp4`
      - `bun run render:30` → `motion/out/aleph-launch-30.mp4`
      - `bun run studio` to tweak scenes live
- [ ] Voiceover (warm, unhurried ~140 wpm; script timed above) — drop into
      `motion/src` as an `<Audio>` track once recorded; timing is already
      aligned to these lines
- [ ] Music bed: worship-electronic, resolves at 1:22
- [x] End card: logo, "Download free", Windows/macOS/Linux badges
- [x] Fonts: Inter (UI), Source Serif 4 (scripture) — self-hosted in
      `motion/public/fonts/` so headless renders never fall back to Arial
