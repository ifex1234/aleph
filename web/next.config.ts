import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { createMDX } from "fumadocs-mdx/next";

loadEnv({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const analyticsApiUrl = process.env.ANALYTICS_API_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // SSR (default) — /api/track and /api/analytics need a Node runtime.
  // Previously "export" for GitHub Pages; the site now deploys to Vercel.
  trailingSlash: true,
  async rewrites() {
    if (!analyticsApiUrl) return [];
    return [
      {
        source: "/api/track",
        destination: `${analyticsApiUrl}/api/track`,
      },
      {
        source: "/api/analytics",
        destination: `${analyticsApiUrl}/api/analytics`,
      },
      {
        // BACHS support (checkout/resume/status/webhook) lives on server-aleph;
        // the desktop app and the BACHS webhook target this site's domain.
        source: "/api/support/:path*",
        destination: `${analyticsApiUrl}/api/support/:path*`,
      },
    ];
  },
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
