export const SITE = {
  name: "Aleph",
  legalName: "openbezal",
  tagline: "Every verse, hymn and song — live on screen.",
  shortDescription:
    "Free open-source church presentation suite: AI sermon-verse spotting, 13,700+ offline hymns, lyrics and decks over NDI for Windows, macOS and Linux.",
  description:
    "Aleph is a free, open-source presentation suite for worship gatherings: live AI passage spotting from sermon audio, 13,700+ offline hymns with stanza display, congregational song lyrics, image, video and PDF decks, sermon notes, a service timer, motion themes and multi-output NDI for OBS, vMix and sanctuary production.",
  url: "https://openaleph.com",
  locale: "en_US",
  twitterHandle: "@openbezal",
  founded: "2025",
  category: "ChurchSoftware",
  operatingSystems: ["Windows", "macOS", "Linux"],
  repo: {
    owner: "ifex1234",
    name: "aleph",
    url: "https://github.com/ifex1234/aleph",
    releases: "https://github.com/ifex1234/aleph/releases",
    latestRelease: "https://github.com/ifex1234/aleph/releases/latest",
    // `/releases/latest` resolves to the newest published, non-prerelease
    // release, so these track each tagged release with no hand re-upload.
    // Filenames are pinned by `artifactName` in electron-builder.yml, so
    // they stay identical across versions. macOS builds are Apple Silicon.
    downloadWindows:
      "https://github.com/ifex1234/aleph/releases/latest/download/Aleph-windows-x64-setup.exe",
    downloadMac:
      "https://github.com/ifex1234/aleph/releases/latest/download/Aleph-macos-arm64.dmg",
    downloadLinux:
      "https://github.com/ifex1234/aleph/releases/latest/download/Aleph-linux-x86_64.AppImage",
    discussions: "https://github.com/ifex1234/aleph/discussions",
    stars: { fallback: 221 },
  },
  socials: {
    github: "https://github.com/openbezal/aleph",
    twitter: "https://x.com/openbezal",
    linkedin: "https://www.linkedin.com/company/openbezal",
    email: "mailto:hello@openbezal.com",
  },
  stats: {
    languages: "2+",
    translations: "6+",
    hymns: "13,700+",
    hymnStanzas: "69,600+",
  },
} as const;

/**
 * Where a "Download" CTA should point: straight at the installer for the
 * visitor's platform. Church volunteers should not have to pick a file out of a
 * GitHub release page. Unrecognised platforms still land on the release list,
 * where every bundle (.msi, .deb, .rpm) is available.
 */
export function downloadHref(platform: string | null | undefined): string {
  switch (platform) {
    case "windows":
      return SITE.repo.downloadWindows;
    case "mac":
      return SITE.repo.downloadMac;
    case "linux":
      return SITE.repo.downloadLinux;
    default:
      return SITE.repo.latestRelease;
  }
}

export async function getGitHubStars(): Promise<number> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `https://api.github.com/repos/${SITE.repo.owner}/${SITE.repo.name}`,
      { headers }
    );
    if (!res.ok) return SITE.repo.stars.fallback;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : SITE.repo.stars.fallback;
  } catch {
    return SITE.repo.stars.fallback;
  }
}
