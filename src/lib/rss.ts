import { cacheLife } from "next/cache";

import { fallbackPosts, substackFeed } from "@content/blog";
import type { FeedPost, LatestVideo } from "@/components/os/server-data";
import { SITE_URL } from "@/lib/site";
import { fetchLatestVideo } from "@/lib/youtube";
import { decode, field } from "@/lib/xml";


function stripHtml(html: string) {
  return decode(html.replace(/<(script|style|figure)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function excerptOf(html: string, words = 70) {
  const text = stripHtml(html);
  const list = text.split(" ");
  return list.length > words ? `${list.slice(0, words).join(" ")}…` : text;
}

export function parseFeed(xml: string): FeedPost[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const enclosure = item.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image\/[^"]+"/);
    const content = field(item, "content:encoded");
    const inlineImg = content.match(/<img[^>]+src="([^"]+)"/);
    const date = new Date(field(item, "pubDate"));
    return {
      title: decode(field(item, "title")),
      subtitle: decode(field(item, "description")),
      url: field(item, "link"),
      date: Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10),
      image: decode(enclosure?.[1] ?? inlineImg?.[1] ?? ""),
      excerpt: excerptOf(content),
    };
  });
}

const fallback = (): FeedPost[] => fallbackPosts.map((p) => ({ ...p, excerpt: p.subtitle }));

/** Substack posts, fetched server-side and refreshed every 6 hours. Falls back to content/blog.ts. */
export async function getPosts(): Promise<{ posts: FeedPost[]; fromFeed: boolean }> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 21600, expire: 604800 });
  if (!substackFeed) return { posts: fallback(), fromFeed: false };
  try {
    const res = await fetch(substackFeed, {
      headers: { "user-agent": `${new URL(SITE_URL).host} (+${SITE_URL})` },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`RSS ${res.status}`);
    const posts = parseFeed(await res.text()).filter((p) => p.title && p.url.startsWith("https://"));
    if (!posts.length) throw new Error("RSS empty");
    return { posts: posts.slice(0, 20), fromFeed: true };
  } catch {
    return { posts: fallback(), fromFeed: false };
  }
}

/**
 * The newest video, cached for 6 hours and refreshed in the background. If YouTube's feed fails
 * (it has returned 404 for whole mornings), it is the committed snapshot: never the channel card
 * while we have ever seen a video.
 */
export async function getLatestVideo(): Promise<LatestVideo | null> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 21600, expire: 604800 });
  return fetchLatestVideo();
}
