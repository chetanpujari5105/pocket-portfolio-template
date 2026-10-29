/*
 * The lock screen. Its three notifications are the site's own content, not system notifications:
 * the newest blog post (from the Substack feed, or the first of content/blog.ts), the post below,
 * and one project. Under the clock: battery, your GitHub week and a small clock on your time.
 * Everything here is SAMPLE content for "Alex Rivera". ✏️ EDIT each field.
 */

/**
 * ✏️ EDIT: your newest reel or short (Instagram, TikTok, YouTube Shorts): its link, and the first
 * lines of its caption word for word. No thumbnail: social image links are signed and expire.
 * Set `latestReel` to null to drop this notification.
 */
export const latestReel: { app: string; url: string; title: string; text: string; posted: string } | null = {
  app: "Instagram", // the app name on the notification (it wears the Instagram mark)
  url: "https://example.com/instagram/reel/sample",
  title: "Sample reel: three design tips in 30 seconds",
  text: "Sample caption: replace this with the first line of your newest reel.",
  posted: "2026-01-12T12:00:00Z", // ISO date and time it was posted
};

/** ✏️ EDIT: the project the lock screen points at (an id from content/projects.ts). */
export const lockProjectId = "sample-app";

/** ✏️ EDIT: the small clock widget: your city's name and its IANA time zone. */
export const cityClock = { city: "Lisbon", timeZone: "Europe/Lisbon" };
