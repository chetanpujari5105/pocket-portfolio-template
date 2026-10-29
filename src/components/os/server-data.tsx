"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import type { BlogPost } from "@content/schema";

export type FeedPost = BlogPost & { excerpt: string };

export type LatestVideo = { id: string; title: string; url: string; published: string; thumb: string };

type ServerData = { posts: FeedPost[]; fromFeed: boolean; video: LatestVideo | null };

/** Fetches the feed again; resolves to how many posts are new. */
type Refresh = () => Promise<number>;

const Ctx = createContext<ServerData & { refresh: Refresh }>({
  posts: [],
  fromFeed: false,
  video: null,
  refresh: async () => 0,
});

/** Hands server-fetched data (Substack RSS) to the client-side apps; Blog can refresh it. */
export function ServerDataProvider({ value, children }: { value: ServerData; children: ReactNode }) {
  const [data, setData] = useState(value);
  const known = useRef(new Set(value.posts.map((p) => p.url)));
  const refresh = useCallback<Refresh>(async () => {
    const res = await fetch("/api/feed", { cache: "no-store" });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const next = (await res.json()) as Pick<ServerData, "posts" | "fromFeed">;
    const added = next.posts.filter((p) => !known.current.has(p.url)).length;
    next.posts.forEach((p) => known.current.add(p.url));
    setData((prev) => ({ ...prev, ...next }));
    return added;
  }, []);
  const ctx = useMemo(() => ({ ...data, refresh }), [data, refresh]);
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export const useServerData = () => useContext(Ctx);
