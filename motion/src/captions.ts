import type { CaptionLine } from "./components/CaptionTrack";

const S = (t: number) => Math.round(t * 30);

/** Voiceover lines from MOTION_DESIGN.md, timed to the 90s edit. */
export const FILM_CAPTIONS: CaptionLine[] = [
  { from: S(0.8), to: S(4.4), text: "It's Sunday morning. The preacher calls a verse — and your heart skips a beat." },
  { from: S(4.4), to: S(8.2), text: "Three apps open, a hundred tabs, and a congregation waiting…" },
  { from: S(8.2), to: S(11.6), text: "…to find John 3:16 before the moment passes." },

  { from: S(12.4), to: S(17.0), text: "Meet Aleph — the presentation app that listens." },
  { from: S(17.0), to: S(21.6), text: "It hears the sermon, understands it, and drives your screens for you." },

  { from: S(22.4), to: S(27.2), text: "As the message is preached, Aleph transcribes every word…" },
  { from: S(27.2), to: S(31.8), text: "…and detects every scripture reference. Automatically." },
  { from: S(31.8), to: S(36.0), text: "No typing. No searching. The verse is on screen before the sentence ends." },
  { from: S(36.0), to: S(39.5), text: "In multiple translations. Even when the internet drops." },

  { from: S(40.5), to: S(45.2), text: "Verses, song lyrics, thirteen thousand hymns, announcement slides…" },
  { from: S(45.2), to: S(50.0), text: "Images, video, even PDFs. One app, one laptop, one calm operator." },
  { from: S(50.0), to: S(55.0), text: "Every line auto-fits the screen, so nothing overflows or gets cut." },
  { from: S(55.0), to: S(57.6), text: "One app. Every screen." },

  { from: S(58.6), to: S(63.2), text: "And it looks like a design team made it." },
  { from: S(63.2), to: S(67.0), text: "Animated gradient backgrounds, custom themes…" },
  { from: S(67.0), to: S(69.7), text: "…and broadcast-grade NDI output for your livestream." },

  { from: S(70.6), to: S(75.2), text: "Aleph was built for real church life: volunteers, not video engineers." },
  { from: S(75.2), to: S(78.6), text: "Run it from one laptop — and keep your eyes on the room, not the screen." },
  { from: S(78.6), to: S(81.7), text: "And trust what's on screen is right — because Aleph heard it too." },

  { from: S(82.4), to: S(86.0), text: "Aleph. The sermon, on screen." },
  { from: S(86.0), to: S(89.4), text: "Download free today — for Windows, macOS, and Linux." },
];

/** The 30s cutdown: one line per scene. */
export const CUTDOWN_CAPTIONS: CaptionLine[] = [
  { from: S(0.4), to: S(5.6), text: "The preacher calls a verse — and Sunday morning holds its breath." },
  { from: S(6.2), to: S(15.6), text: "Aleph listens to the sermon and puts every verse on screen. Automatically." },
  { from: S(16.2), to: S(23.4), text: "Verses, lyrics, hymns, slides — always framed, always beautiful." },
  { from: S(24.2), to: S(29.4), text: "Aleph. The sermon, on screen. Download free." },
];
