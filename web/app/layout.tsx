import type { Metadata, Viewport } from "next";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./globals.css";
import { SITE } from "./_lib/site";
import { StructuredData } from "./_components/seo/structured-data";
import { TrackVisit } from "./_components/track-visit";

const TITLE = `${SITE.name} — Free church presentation suite for scripture, hymns & song`;
const OG_TITLE = `${SITE.name} — ${SITE.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: TITLE,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.shortDescription,
  applicationName: SITE.name,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  keywords: [
    "Bible verse detection",
    "real-time scripture overlay",
    "sermon transcription",
    "church broadcast software",
    "NDI overlay",
    "live scripture display",
    "church media",
    "AI Bible verse finder",
    "sermon AI",
    "live sermon scripture",
    "OBS scripture overlay",
    "vMix scripture overlay",
    "church livestream tools",
    "speech-to-scripture",
    "hymn projection software",
    "offline hymnal",
    "worship lyrics projection",
    "church slides software",
    "service timer",
    "animated worship backgrounds",
    "multi-output NDI",
    "Aleph",
  ],
  authors: [{ name: SITE.legalName, url: SITE.repo.url }],
  creator: SITE.legalName,
  publisher: SITE.legalName,
  category: "Religion",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: OG_TITLE,
    description: SITE.description,
    siteName: SITE.name,
    url: SITE.url,
    locale: SITE.locale,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: OG_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: SITE.description,
    site: SITE.twitterHandle,
    creator: SITE.twitterHandle,
    images: ["/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // icon and apple-icon are wired automatically from app/icon.svg and
  // app/apple-icon.tsx — overriding here would suppress Next.js's defaults.
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body
        className="min-h-full bg-background text-foreground"
        suppressHydrationWarning
      >
        <TrackVisit />
        <StructuredData />
        <RootProvider
          theme={{
            attribute: "class",
            defaultTheme: "system",
            enableSystem: true,
            disableTransitionOnChange: true,
          }}
          search={{
            options: {
              type: "static",
            },
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
