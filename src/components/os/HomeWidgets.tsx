"use client";

import Image from "next/image";

import { profile } from "@content/profile";
import type { WidgetId } from "@/lib/home";
import { setLaunchOrigin } from "@/lib/launch";
import { openApp } from "@/lib/router";

import { BrandGlyph } from "./BrandIcon";
import { youtube } from "./brand-marks";
import { ExpertiseStack } from "./ExpertiseStack";
import { useServerData } from "./server-data";

/*
 * Widgets fill the grid cells they're given (HomeScreen sizes the slot); everything inside is
 * sized in container units of its own tile (`container-type: size`), so a 2×2 or 4×2 widget looks the same
 * on a 320 px phone, a large flagship or a landscape screen, and never spills out.
 */

const slugOf = (url: string) => url.replace(/\/+$/, "").split("/").pop() || url;
const OUTER = "icon-press flex size-full flex-col items-center gap-[calc(var(--icon)*0.11)] select-none";
const TILE = "widget-press [container-type:size] relative min-h-0 w-full flex-1 overflow-hidden widget-r text-left";

/** 4×2: the latest Substack post. Opens it in Blog. */
export function BlogWidget() {
  const { posts } = useServerData();
  const post = posts[0];
  if (!post) return null;
  return (
    <button
      type="button"
      data-nav
      data-app-icon="blog"
      aria-label={`Latest post: ${post.title}. Open in Blog`}
      onClick={(e) => {
        setLaunchOrigin("blog", e.currentTarget.querySelector<HTMLElement>("[data-widget-tile]") ?? e.currentTarget);
        openApp("blog", slugOf(post.url));
      }}
      className={OUTER}
    >
      <span data-widget-tile className={`${TILE} flex flex-col justify-end bg-[#111112] text-white shadow-[0_2px_8px_rgb(0_0_0/0.12)]`}>
        {post.image ? (
          <Image src={post.image} alt="" fill sizes="(max-width: 600px) 92vw, 380px" quality={70} className="object-cover" />
        ) : (
          <span className="absolute inset-0 bg-[linear-gradient(150deg,var(--accent),var(--accent-deep))]" />
        )}
        <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_12%,rgb(0_0_0/0.62)_46%,rgb(0_0_0/0.9))]" />
        <span className="relative p-[clamp(10px,4cqw,16px)]">
          <span className="block text-[clamp(9px,2.6cqw,11px)] font-bold tracking-wider text-white/80 uppercase">Latest on the blog</span>
          <span className="mt-0.5 line-clamp-2 text-[clamp(13px,min(4.4cqw,10.5cqh),17px)] leading-tight font-bold tracking-[-0.02em]">{post.title}</span>
        </span>
      </span>
      <span className="icon-label">Blog</span>
    </button>
  );
}

/** 2×2: the latest YouTube video, or a channel card while the channel has none public. */
export function VideoWidget() {
  const { video } = useServerData();
  const handle = profile.socials.find((s) => s.id === "youtube")?.handle ?? "YouTube";
  return (
    <a
      href={video?.url ?? profile.youtube}
      target="_blank"
      rel="noopener noreferrer"
      data-nav
      aria-label={video ? `Latest video: ${video.title} (opens YouTube in a new tab)` : `YouTube ${handle}: watch on YouTube (opens in a new tab)`}
      className={OUTER}
    >
      {video ? (
        <span data-widget-tile className={`${TILE} flex flex-col justify-end bg-[#0b0b0d] text-white shadow-[0_2px_8px_rgb(0_0_0/0.12)]`}>
          <Image src={video.thumb} alt="" fill sizes="200px" quality={70} className="object-cover" />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgb(0_0_0/0.82))]" />
          <span className="absolute top-[9cqmin] left-[9cqmin] grid h-[15cqmin] w-[21cqmin] place-items-center rounded-[4cqmin] bg-[#ff0033]">
            <svg viewBox="0 0 10 12" className="ml-[1cqmin] h-[6cqmin]" fill="#fff" aria-hidden>
              <path d="M0 0v12l10-6z" />
            </svg>
          </span>
          <span className="relative p-[9cqmin]">
            <span className="block text-[clamp(9px,6cqmin,11px)] font-bold tracking-wider text-white/75 uppercase">New video</span>
            <span className="line-clamp-2 text-[clamp(11px,8cqmin,14px)] leading-snug font-bold">{video.title}</span>
          </span>
        </span>
      ) : (
        <span
          data-widget-tile
          className={`${TILE} flex flex-col justify-between bg-[radial-gradient(120%_90%_at_100%_0%,rgb(255_0_51/0.38),transparent_60%),linear-gradient(160deg,#241012,#0d0d10_70%)] p-[10cqmin] text-white shadow-[0_2px_8px_rgb(0_0_0/0.12),inset_0_0_0_1px_rgb(255_255_255/0.08)]`}
        >
          <span className="grid h-[25cqmin] w-[35cqmin] place-items-center rounded-[7cqmin] bg-white shadow-[0_4px_12px_rgb(255_0_51/0.35)]">
            <BrandGlyph mark={youtube} className="h-[17cqmin] w-[25cqmin] text-[#ff0033]" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[clamp(12px,9.4cqmin,16px)] leading-tight font-bold tracking-tight">{handle}</span>
            <span className="mt-[4cqmin] inline-flex w-fit max-w-full items-center gap-[3cqmin] rounded-full bg-white/14 px-[6cqmin] py-[2.4cqmin] text-[clamp(9px,6.6cqmin,12px)] font-semibold whitespace-nowrap text-white/90">
              <svg viewBox="0 0 10 12" className="h-[5.4cqmin]" fill="currentColor" aria-hidden>
                <path d="M0 0v12l10-6z" />
              </svg>
              Watch on YouTube
            </span>
          </span>
        </span>
      )}
      <span className="icon-label">YouTube</span>
    </a>
  );
}

/** The widgets that load after hydration (Impact, Work with me and GitHub ship with the home screen). */
export function HomeWidget({ id }: { id: WidgetId }) {
  if (id === "blog") return <BlogWidget />;
  if (id === "youtube") return <VideoWidget />;
  if (id === "expertise") return <ExpertiseStack />;
  return null;
}
