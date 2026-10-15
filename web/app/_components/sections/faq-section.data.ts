export type Faq = { question: string; answer: string };

export const FAQS: readonly Faq[] = [
  {
    question: "What is Aleph?",
    answer:
      "Aleph is a free, open-source worship suite for live services. It detects Bible verses in real time from sermon audio, projects 13,700+ offline hymns and song lyrics, runs image/video/PDF slides, captures sermon notes and runs a service timer — all through animated themes and multi-output NDI for OBS, vMix and sanctuary screens. Built with Tauri v2, React and Rust.",
  },
  {
    question: "Does Aleph work during live sermons?",
    answer:
      "Yes. Aleph is built specifically for live services and processes spoken words in real time, typically displaying referenced scriptures within seconds without interrupting the flow of the service.",
  },
  {
    question: "What equipment do I need to run Aleph?",
    answer:
      "You need a computer running Windows, macOS or Linux, an audio feed from your sound system, and a projector or display screen. Aleph works with your existing audio setup and outputs via NDI to OBS, vMix or directly — no specialized hardware required.",
  },
  {
    question: "What Bible translations does Aleph support?",
    answer:
      "Aleph supports KJV, ESV, NIV, NKJV, NLT, and more. You can switch between translations on-the-fly from the operator panel, and each translation is stored locally in your app database for offline use. Verse ranges preserve gaps (e.g. 1, 3, 5) and auto-refetch when you change translation.",
  },
  {
    question: "How do the hymns work? Do I need internet?",
    answer:
      "No internet needed during service. Aleph ships with 13,700+ hymns and 69,600+ stanzas bundled in a local database with full-text search by number, title, first line or any lyric. Filter by hymnal group, open a hymn to see words, music, key, meter and category, then click any stanza to present it live with tune and sheet-music links in context.",
  },
  {
    question: "Can Aleph handle songs, slides and timers too?",
    answer:
      "Yes — that's the point. Save songs with auto-detected Verse/Chorus/Bridge sections, build image/video/PDF slide decks with fade transitions and 1–9 cues, and run stopwatch or countdown with lap times and red under-10-seconds alerts. The Live panel switches between Verse, Timer, Lyrics, Slides and Blank without ever clearing what's on air by accident.",
  },
  {
    question: "What about themes and multiple screens?",
    answer:
      "Design lower-thirds to fullscreen in the Theme Designer with text plates, shadows, outlines, image fills and animated gradients. Create unlimited NDI outputs — sanctuary, stream, overflow — each with its own theme and source name, all painted at full resolution even for DOM slides.",
  },
  {
    question: "How do I get started with Aleph?",
    answer:
      "Download the free desktop app for Windows, macOS or Linux, connect your audio feed, pick a theme and you're ready. Most teams are running in under five minutes. Updates install silently in the background — restart when ready. Full setup instructions are in-app and on GitHub.",
  },
  {
    question: "What happens if the pastor paraphrases a verse?",
    answer:
      "Aleph is trained to recognize paraphrased scripture references, not just exact quotations, allowing it to surface the intended Bible passage even when the wording differs from the source translation.",
  },
  {
    question: "Do we still need a projection or media operator?",
    answer:
      "Yes, but their role becomes simpler. Instead of manually searching and switching verses, media operators focus on visuals, livestreams, and overall service quality while Aleph handles scripture projection automatically.",
  },
  {
    question: "Is Aleph difficult to set up or use?",
    answer:
      "No. Aleph is designed for church teams of all technical skill levels. Setup is straightforward, and once running, it operates automatically with minimal interaction during services.",
  },
  {
    question: "How much does Aleph cost?",
    answer:
      "Aleph itself is completely free and open source — no subscription, no account, no license fee. The Free tier transcribes offline with Whisper at ₦0 per sermon. If you want cloud speed, add your own Deepgram API key: their $200 free credit covers roughly 273 two-hour sermons, then about $0.73 (≈₦1,120) per sermon, paid directly to Deepgram.",
  },
  {
    question: "Does Aleph work with OBS Studio and vMix?",
    answer:
      "Yes. Aleph outputs broadcast-ready overlays via NDI, which integrates natively with OBS Studio, vMix, and other professional live production software.",
  },
  {
    question: "My computer warns me about Aleph on first launch. Is that normal?",
    answer:
      "Yes. Aleph is unsigned — there is no paid Apple or Windows certificate behind this free project — so both systems warn the first time. On Windows, choose More info, then Run anyway. On macOS, drag Aleph to your Applications folder, then open System Settings, go to Privacy & Security, and choose Open Anyway next to the notice about Aleph. You only do this once. If macOS instead says Aleph is damaged (releases up to v0.3.0), open Terminal and run: xattr -cr /Applications/Aleph.app",
  },
  {
    question: "What are the system requirements?",
    answer:
      "Windows 10 or 11 on a 64-bit machine, macOS 11 Big Sur or newer on an Apple Silicon Mac, or a 64-bit Linux distribution. There is no Intel Mac build — Intel Mac owners can build Aleph from source on GitHub.",
  },
];
