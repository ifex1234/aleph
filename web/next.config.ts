import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { createMDX } from "fumadocs-mdx/next";

loadEnv({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const nextConfig: NextConfig = {
  // SSR (default) — /api/track and /api/analytics need a Node runtime.
  // Previously "export" for GitHub Pages; the site now deploys to Vercel.
  trailingSlash: true,
  // The default next/image loader requires a server runtime; we ship every
  // image through the static pipeline, so disable the optimizer and let
  // the browser fetch assets as-is.
  images: { unoptimized: true },
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  experimental: {
    optimizePackageImports: ["@tabler/icons-react", "lucide-react"],
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
