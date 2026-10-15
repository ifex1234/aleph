import { SITE, downloadHref } from "./site";

/**
 * The release pipeline publishes one release object per platform job for the
 * same tag, so `/releases/latest/download/<name>` only resolves assets from
 * whichever object GitHub picks — the rest 404. Instead of hardcoding a
 * filename, resolve the real installer at click time by scanning recent
 * stable releases for a matching asset. Anything goes wrong (offline,
 * rate-limited, renamed) and we fall back to the static URL.
 */

type PlatformKey = "windows" | "mac" | "linux";

const MATCHERS: Record<PlatformKey, RegExp> = {
  // NSIS installer, e.g. Aleph-windows-x64-setup.exe (also matches legacy
  // Aleph-Setup-0.8.3.exe). Blockmaps end in .blockmap so they never match.
  windows: /\.exe$/i,
  mac: /\.dmg$/i,
  linux: /\.AppImage$/i,
};

type ReleaseAsset = { name: string; browser_download_url: string };
type Release = {
  draft: boolean;
  prerelease: boolean;
  assets?: ReleaseAsset[];
};

let cached: Promise<Release[]> | null = null;

function listReleases(): Promise<Release[]> {
  if (!cached) {
    cached = fetch(
      `https://api.github.com/repos/${SITE.repo.owner}/${SITE.repo.name}/releases?per_page=10`,
      { headers: { Accept: "application/vnd.github+json" } }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`releases: ${res.status}`);
        return res.json() as Promise<Release[]>;
      })
      .catch(() => {
        // Don't cache failures — a retry on the next click may succeed.
        cached = null;
        return [];
      });
  }
  return cached;
}

export async function resolveDownloadUrl(
  platform: string | null | undefined
): Promise<string> {
  const fallback = downloadHref(platform);
  if (platform !== "windows" && platform !== "mac" && platform !== "linux") {
    return fallback;
  }
  try {
    const releases = await listReleases();
    for (const release of releases) {
      if (release.draft || release.prerelease) continue;
      const hit = release.assets?.find((a) =>
        MATCHERS[platform].test(a.name)
      );
      if (hit) return hit.browser_download_url;
    }
  } catch {
    // Fall through to the static URL below.
  }
  return fallback;
}
