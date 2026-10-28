import { cacheLife } from "next/cache";

import { fallbackPosts, substackFeed } from "@content/blog";
import { profile } from "@content/profile";
import type { FeedPost, LatestVideo } from "@/components/os/server-data";
import { SITE_URL } from "@/lib/site";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

function decode(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z#0-9]+);/gi, (m, name: string) => ENTITIES[name] ?? m);
}

function field(item: string, tag: string) {
  const m = item.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
  return m ? m[1].trim() : "";
}

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

/** Channel feed (public, no key). Empty or unreachable → null and the widget links the channel. */
export const YOUTUBE_FEED = profile.youtubeChannelId
  ? `https://www.youtube.com/feeds/videos.xml?channel_id=${profile.youtubeChannelId}`
  : "";

export function parseVideoFeed(xml: string): LatestVideo | null {
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) return null;
  const id = field(entry, "yt:videoId");
  const title = decode(field(entry, "title"));
  if (!/^[\w-]{6,20}$/.test(id) || !title) return null;
  return {
    id,
    title,
    url: `https://www.youtube.com/watch?v=${id}`,
    published: field(entry, "published").slice(0, 10),
    thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

export async function getLatestVideo(): Promise<LatestVideo | null> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 21600, expire: 604800 });
  try {
    if (!YOUTUBE_FEED) return null;
    const res = await fetch(YOUTUBE_FEED, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return parseVideoFeed(await res.text());
  } catch {
    return null;
  }
}
