"use client";

import {
  IconBrandApple,
  IconBrandWindows,
  IconDownload,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { Button } from "./button";
import { usePlatform } from "../../_lib/use-platform";
import { useDownload } from "../../_lib/use-download";

const COPY: Record<
  "mac" | "windows" | "linux" | "other" | "default",
  { label: string; icon: TablerIcon }
> = {
  // Each desktop platform links straight to its installer. "other" covers
  // phones, tablets, and anything unrecognised, which land on the release page
  // rather than being handed a file they cannot open.
  mac: { label: "Download for macOS", icon: IconBrandApple },
  windows: { label: "Download for Windows", icon: IconBrandWindows },
  linux: { label: "Download for Linux", icon: IconDownload },
  other: { label: "Download", icon: IconDownload },
  default: { label: "Download", icon: IconDownload },
};

export function DownloadButton({
  size = "md",
  className,
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  const platform = usePlatform();
  const { href, resolving, onClick } = useDownload(platform);
  const copy = COPY[platform ?? "default"];
  const Icon = copy.icon;

  return (
    <Button
      href={href}
      download
      variant="primary"
      size={size}
      className={className}
      onClick={onClick}
      aria-busy={resolving || undefined}
      aria-live="polite"
    >
      <Icon size={16} aria-hidden stroke={2} />
      <span suppressHydrationWarning>
        {resolving ? "Finding your download…" : copy.label}
      </span>
    </Button>
  );
}
