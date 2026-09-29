import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "https", hostname: "**.boravin.com" },
      { protocol: "https", hostname: "**.onrender.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.icecat.biz" },
    ],
    // Avoid noisy deploy logs when a remote asset briefly times out.
    minimumCacheTTL: 60 * 60 * 24,
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
