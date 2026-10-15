import { SITE } from "../../_lib/site";
import { FAQS } from "../sections/faq-section.data";

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;
const APP_ID = `${SITE.url}/#software`;
const FAQ_ID = `${SITE.url}/#faq`;

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
          SITE.socials.twitter,
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
          "Real-time AI verse detection from live sermon audio",
          "13,700+ offline hymns with stanza presentation",
          "Song lyrics slides with auto section detection",
          "Image, video and PDF slide decks",
          "Sermon notes with auto-capture and service timer",
          "Animated themes and multi-output NDI for OBS and vMix",
          "Multi-translation support: KJV, ESV, NIV, NKJV, NLT",
          "Free and open source with silent auto-updates",
        ],
        keywords:
          "Bible verse detection, sermon transcription, NDI overlay, church broadcast, live scripture, hymn projection, worship lyrics, church slides, service timer",
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
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
