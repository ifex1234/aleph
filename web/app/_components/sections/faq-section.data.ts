export type Faq = { question: string; answer: string };

export const FAQS: readonly Faq[] = [
  {
    question: "What exactly is Aleph?",
    answer:
      "Aleph is a free, open-source presentation suite for worship gatherings. It spots Bible passages live in sermon audio, shows 13,700+ offline hymns plus your own song lyrics, runs picture, video and PDF decks, keeps sermon notes and a service timer — all dressed in motion themes and delivered over multi-output NDI to OBS, vMix and hall screens. It pairs a React interface with a Tauri v2 and Rust core.",
  },
  {
    question: "Does it keep up with a live sermon?",
    answer:
      "That's its home ground. Aleph was shaped around live gatherings and converts speech as it happens, usually putting the mentioned scripture on screen within seconds while the preaching flows on undisturbed.",
  },
  {
    question: "Which gear do we need?",
    answer:
      "Any Windows, macOS or Linux computer, a sound-desk feed and a projector or display. Aleph slots into the audio chain you already have and sends video out over NDI to OBS, vMix or straight to screens — nothing exotic to buy.",
  },
  {
    question: "Which Bible versions are covered?",
    answer:
      "KJV, ESV, NIV, NKJV, NLT and others. Flip versions mid-service from the operator panel; every text lives in the on-device library for offline use. Verse ranges hold their gaps (such as 1, 3, 5) and reload by themselves after a version switch.",
  },
  {
    question: "How do hymns behave without internet?",
    answer:
      "The venue connection doesn't matter. Aleph carries 13,700+ hymns and 69,600+ stanzas in a built-in library with full-text lookup across numbers, titles, opening lines and every lyric. Narrow by hymnal group, inspect credits, key, metre and category, then send any stanza live — with tune and sheet-music links beside it.",
  },
  {
    question: "Songs, decks and timers too?",
    answer:
      "That is the whole idea. Keep songs whose Verse, Chorus and Bridge parts split themselves apart, assemble image, video and PDF decks with fades and number-key cues, and run a stopwatch or countdown with lap history plus a red warning under ten seconds. The Live panel flips between Passage, Timer, Lyrics, Slides and Blank without ever wiping the live output by mistake.",
  },
  {
    question: "How do themes and extra screens work?",
    answer:
      "Shape anything from lower-thirds to full-screen scenes in the theme studio — text backplates, shadows, outlines, picture fills and drifting gradients. Then open as many NDI destinations as you need — hall, stream, overflow — each wearing its own theme and feed name, rendered at full sharpness even for interface-driven slides.",
  },
  {
    question: "How quickly can we start?",
    answer:
      "Fetch the free desktop build for Windows, macOS or Linux, hook up audio, choose a look and go — most crews are live inside five minutes. Fresh releases land quietly in the background and apply on restart. In-app guidance plus the GitHub repo cover the rest.",
  },
  {
    question: "What if the preacher paraphrases?",
    answer:
      "Aleph looks past exact wording and hunts for the meant passage, so a loosely retold verse still brings up the right text even when the phrasing strays from the printed translation.",
  },
  {
    question: "Is an operator still needed?",
    answer:
      "Yes — but the job gets lighter. Rather than hunting and flipping verses by hand, your media volunteers polish visuals, mind the stream and shepherd service quality while Aleph carries the scripture load.",
  },
  {
    question: "How hard is setup for non-technical teams?",
    answer:
      "Deliberately gentle. Aleph welcomes crews of any skill level: installation is plain, and once running it largely minds itself through the gathering with barely a click needed.",
  },
  {
    question: "What will it cost our church?",
    answer:
      "The app is free and open source — no membership, no login, no licence fee. The built-in tier transcribes offline through Whisper at ₦0 a sermon. For cloud pace, paste in your own Deepgram key: their $200 starter credit spans about 273 two-hour sermons, afterwards near $0.73 (about ₦1,120) per sermon, billed by Deepgram alone.",
  },
  {
    question: "Will it talk to OBS Studio and vMix?",
    answer:
      "Smoothly. Aleph pushes production-grade visuals over NDI, which OBS Studio, vMix and fellow live-production tools ingest natively.",
  },
  {
    question: "Our computer flagged Aleph at first launch — normal?",
    answer:
      "Entirely. Aleph ships unsigned — no paid Apple or Windows certificate backs this free project — so both platforms caution you once. On Windows pick More info, then Run anyway. On macOS move Aleph into Applications, then under System Settings → Privacy & Security choose Open Anyway beside the Aleph notice. It happens a single time. Should macOS call Aleph damaged (releases through v0.3.0), run in Terminal: xattr -cr /Applications/Aleph.app",
  },
  {
    question: "What are the minimum requirements?",
    answer:
      "Windows 10 or 11 on 64-bit hardware, macOS 11 Big Sur or newer on Apple Silicon, or a 64-bit Linux distro. No Intel Mac build ships — Intel Mac owners can compile from the GitHub source.",
  },
];
