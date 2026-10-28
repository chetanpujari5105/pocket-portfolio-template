import type { MetadataRoute } from "next";

import { profile } from "@content/profile";

/** Installable: opens full screen like the phone it draws. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: profile.name,
    short_name: profile.site.shortName,
    description: `${profile.shortBio} A portfolio you use like a phone.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
