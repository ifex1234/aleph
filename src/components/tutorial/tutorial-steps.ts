import type { Step } from "react-joyride"

const STEP_DEFAULTS = {
  skipBeacon: true,
} as const satisfies Partial<Step>

export const TUTORIAL_STEPS: Step[] = [
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="transcript-panel"]',
    title: "Live Transcript",
    content:
      "Start transcribing to convert speech to text in real time. Detected Bible verses are highlighted automatically.",
    placement: "right",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="detections-panel"]',
    title: "AI Detections",
    content:
      "Detected verses appear here. Press Present to display a verse on screen, or Queue to save it for later.",
    placement: "left",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="book-search"]',
    title: "Book Search",
    content:
      "Look up any verse by book, chapter, and number. Switch translations from the dropdown.",
    placement: "bottom",
    spotlightPadding: 2,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="context-search"]',
    title: "Context Search",
    content:
      "Search by phrase or topic. Aleph uses AI to find matching verses.",
    placement: "bottom",
    spotlightPadding: 2,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="quick-nav"]',
    title: "Quick Navigation",
    content:
      "Type to instantly navigate: 'J' → 'Joshua' or '1 J' → '1 John', press Tab to advance stages, then type chapter and verse.",
    placement: "bottom",
    spotlightPadding: 2,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="queue-panel"]',
    title: "Verse Queue",
    content:
      "Your queued verses live here. Drag to reorder, click to present. Build your set list before going live.",
    placement: "left",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="preview-panel"]',
    title: "Programme Preview",
    content:
      "Preview how verses will look before going live. What you see here is what your audience sees.",
    placement: "bottom",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="live-output-panel"]',
    title: "Live Display",
    content:
      "The live output. Presented verses appear here and on connected displays or NDI outputs.",
    placement: "bottom",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="lyrics"]',
    title: "Lyrics",
    content:
      "Write songs with verses separated by blank lines. Present a song, then step through verses from the Live display footer or with the arrow keys.",
    placement: "right",
    spotlightPadding: 4,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="hymns"]',
    title: "Hymns",
    content:
      "Browse over 13,000 hymns by number, title, or first line. Click any stanza to present it live.",
    placement: "right",
    spotlightPadding: 4,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="slides"]',
    title: "Slides",
    content:
      "Add image, video, or PDF slides for announcements. Click a slide to present it, then navigate with the footer controls.",
    placement: "right",
    spotlightPadding: 4,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="notes"]',
    title: "Notes",
    content:
      "Keep service notes handy in a side panel that never goes live.",
    placement: "right",
    spotlightPadding: 4,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="broadcast"]',
    title: "Broadcast",
    content:
      "Configure NDI output, display windows, and resolution for your production setup.",
    placement: "bottom",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="theme"]',
    title: "Themes",
    content:
      "Choose from built-in themes or design your own with the visual editor.",
    placement: "bottom",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="settings"]',
    title: "Settings",
    content:
      "Configure audio input, Bible translations, display mode, remote control, and API keys.",
    placement: "bottom",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="support"]',
    title: "Support",
    content:
      "Support Aleph's development, explore sister apps, and find donation details.",
    placement: "right",
    spotlightPadding: 4,
  },
]
