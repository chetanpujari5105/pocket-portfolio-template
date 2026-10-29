// Writes public/content/youtube-latest.json: the YouTube widget's last good video, used whenever
// the channel feed fails (it returns 404 for hours at a time). Runs before every Vercel build
// (best effort: a failed fetch keeps the committed file); re-run by hand now and then.
// Usage: npx tsx scripts/youtube-snapshot.mts [--if-vercel]
import { writeFileSync } from "node:fs";

import { parseVideoFeed, YOUTUBE_FEED } from "../src/lib/youtube";

if (process.argv.includes("--if-vercel") && !process.env.VERCEL) process.exit(0);
if (!YOUTUBE_FEED) {
  console.log("youtube snapshot skipped (no youtubeChannelId in content/profile.ts)");
  process.exit(0);
}
try {
  const res = await fetch(YOUTUBE_FEED, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const video = parseVideoFeed(await res.text());
  if (!video) throw new Error("no video in the feed");
  writeFileSync("public/content/youtube-latest.json", JSON.stringify(video, null, 2) + "\n");
  console.log(`youtube snapshot: ${video.id} ${video.published} ${video.title}`);
} catch (error) {
  console.log(`youtube snapshot kept (${(error as Error).message})`);
}
