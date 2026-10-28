import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// One page: every app lives behind a #hash on the home page
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL, changeFrequency: "weekly", priority: 1 }];
}
