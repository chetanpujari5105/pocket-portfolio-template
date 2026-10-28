import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The build cache served a stale globals.css through the Tailwind loader (edits to plain CSS
    // rules never reached the bundle). Clean builds take ~5 s, so builds always start cold.
    turbopackFileSystemCacheForBuild: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Thumbnails and avatars are fetched at exactly their display size at 1×, 2× and 3×
    // (56, 58, 64, 72, 80 and 96 px boxes) instead of the next size up.
    imageSizes: [32, 48, 56, 58, 64, 72, 80, 96, 112, 116, 128, 144, 160, 168, 174, 192, 216, 240, 256, 288, 384],
    qualities: [70, 80],
    // Substack post images for the Blog app
    remotePatterns: [
      { protocol: "https", hostname: "substackcdn.com", pathname: "/**" },
      { protocol: "https", hostname: "substack-post-media.s3.amazonaws.com", pathname: "/**" },
      // Latest YouTube video thumbnail (Home page 2)
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
