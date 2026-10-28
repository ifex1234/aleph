import { SITE } from "../../_lib/site"
import { FAQS } from "../sections/faq-section.data"

const ORG_ID = `${SITE.url}/#organization`
const SITE_ID = `${SITE.url}/#website`
const APP_ID = `${SITE.url}/#software`
const FAQ_ID = `${SITE.url}/#faq`

export function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: SITE.legalName,
        alternateName: SITE.name,
        url: SITE.url,
        logo: {
          "@type": "ImageObject",
          url: `${SITE.url}/icon.svg`,
          width: 1024,
          height: 1024,
        },
        sameAs: [
          SITE.socials.github,
          // SITE.socials.twitter,
          SITE.socials.linkedin,
        ],
        foundingDate: SITE.founded,
      },
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        url: SITE.url,
        name: SITE.name,
        description: SITE.description,
        inLanguage: "en",
        publisher: { "@id": ORG_ID },
      },
      {
        "@type": "SoftwareApplication",
        "@id": APP_ID,
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        applicationCategory: "MultimediaApplication",
        operatingSystem: SITE.operatingSystems.join(", "),
        downloadUrl: SITE.repo.downloadWindows,
        installUrl: SITE.repo.releases,
        softwareVersion: "latest",
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        publisher: { "@id": ORG_ID },
        featureList: [
          "Live AI passage spotting from sermon audio",
          "13,700+ hymns carried offline with stanza display",
          "Congregational song lyrics with automatic part splitting",
          "Picture, video and PDF decks for announcements",
          "Sermon notes with self-capture plus a service timer",
          "Motion themes and multi-output NDI for OBS and vMix",
          "Many translations covered: KJV, ESV, NIV, NKJV, NLT",
          "Free and open source with hush-quiet background updates",
        ],
        keywords:
          "live passage spotting, sermon transcription, NDI visuals, church production, on-screen scripture, hymn display, worship lyrics, announcement decks, stage timer",
      },
      {
        "@type": "FAQPage",
        "@id": FAQ_ID,
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}
