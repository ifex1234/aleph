"use client";

import { useCallback, useRef, useState } from "react";
import { downloadHref } from "./site";
import { resolveDownloadUrl } from "./resolve-download";

/**
 * Shared download behavior: the rendered href is the static installer URL
 * (works without JS, seen by crawlers), but a click resolves the real asset
 * via the GitHub API and navigates in the same tab so the file downloads
 * instead of opening a GitHub page. Unrecognised platforms keep the default
 * link through to the release list.
 */
export function useDownload(platform: string | null | undefined) {
  const [resolving, setResolving] = useState(false);
  const busy = useRef(false);
  const href = downloadHref(platform);

  const onClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        platform !== "windows" &&
        platform !== "mac" &&
        platform !== "linux"
      ) {
        return;
      }
      e.preventDefault();
      if (busy.current) return;
      busy.current = true;
      setResolving(true);
      try {
        const url = await resolveDownloadUrl(platform);
        window.location.assign(url);
      } finally {
        busy.current = false;
        setResolving(false);
      }
    },
    [platform]
  );

  return { href, resolving, onClick };
}
