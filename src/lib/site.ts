import { profile } from "@content/profile";

/** Canonical site URL: NEXT_PUBLIC_SITE_URL, else Vercel's production domain, else profile.site.url. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : profile.site.url)
).replace(/\/+$/, "");
