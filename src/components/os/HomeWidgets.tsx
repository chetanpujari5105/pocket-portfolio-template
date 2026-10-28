"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { expertise } from "@content/expertise";
import { profile } from "@content/profile";
import type { WidgetId } from "@/lib/home";
import { setLaunchOrigin } from "@/lib/launch";
import { openApp } from "@/lib/router";

import type { ContributionDay } from "@/lib/github";

import { BrandGlyph } from "./BrandIcon";
import { github, youtube } from "./brand-marks";
import { useServerData } from "./server-data";

/*
 * Widgets fill the grid cells they're given (HomeScreen sizes the slot); everything inside is
 * sized in container units of its own tile (`container-type: size`), so a 2×2 or 4×2 widget looks the same
 * on a 320 px phone, a large flagship or a landscape screen, and never spills out.
 */

const slugOf = (url: string) => url.replace(/\/+$/, "").split("/").pop() || url;
const OUTER = "icon-press flex size-full flex-col items-center gap-[5px] select-none";
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
      <span data-widget-tile className={`${TILE} flex flex-col justify-end bg-app-surface text-white shadow-[0_4px_14px_rgb(0_0_0/0.18)]`}>
        {post.image ? (
          <Image src={post.image} alt="" fill sizes="(max-width: 600px) 92vw, 380px" quality={70} className="object-cover" />
        ) : (
          <span className="absolute inset-0 bg-[linear-gradient(150deg,var(--accent),var(--accent-deep))]" />
        )}
        <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgb(0_0_0/0.55)_52%,rgb(0_0_0/0.88))]" />
        <span className="relative p-[clamp(10px,4cqw,16px)]">
          <span className="block text-[clamp(9px,2.6cqw,11px)] font-bold tracking-wider text-white/80 uppercase">Latest on the blog</span>
          <span className="mt-0.5 line-clamp-2 text-[clamp(13px,min(4.6cqw,11cqh),18px)] leading-tight font-bold tracking-tight">{post.title}</span>
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
        <span data-widget-tile className={`${TILE} flex flex-col justify-end bg-[#0b0b0d] text-white shadow-[0_4px_14px_rgb(0_0_0/0.18)]`}>
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
          className={`${TILE} flex flex-col justify-between bg-[radial-gradient(120%_90%_at_100%_0%,rgb(255_0_51/0.38),transparent_60%),linear-gradient(160deg,#241012,#0d0d10_70%)] p-[10cqmin] text-white shadow-[0_4px_14px_rgb(0_0_0/0.18),inset_0_0.5px_0_rgb(255_255_255/0.14)]`}
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

/** 2×2: a stack of expertise cards (two peeking behind the first). Opens Expertise. */
export function ExpertiseStack() {
  const [front, ...rest] = expertise;
  const behind = rest.slice(0, 2);
  return (
    <button
      type="button"
      data-nav
      data-app-icon="expertise"
      aria-label={`Expertise: ${expertise.map((e) => e.title).join(", ")}. Open Expertise`}
      onClick={(e) => {
        setLaunchOrigin("expertise", e.currentTarget.querySelector<HTMLElement>("[data-widget-tile]") ?? e.currentTarget);
        openApp("expertise");
      }}
      className={OUTER}
    >
      <span data-widget-tile className="widget-press [container-type:size] relative min-h-0 w-full flex-1 overflow-hidden text-left">
        {/* Back cards: slivers above the front one, narrower and dimmer with depth */}
        {behind
          .slice()
          .reverse()
          .map((area, i) => {
            const depth = behind.length - i;
            return (
              <span
                key={area.id}
                aria-hidden
                className="absolute bottom-[10%] widget-r bg-app-surface shadow-[0_2px_8px_rgb(0_0_0/0.18)]"
                style={{ top: `${(2 - depth) * 6}%`, left: `${depth * 7}%`, right: `${depth * 7}%`, opacity: 1 - depth * 0.28 }}
              />
            );
          })}
        <span className="absolute inset-x-0 top-[12%] bottom-0 flex flex-col justify-between widget-r bg-app-surface p-[9cqmin] text-app-ink shadow-[0_6px_16px_rgb(0_0_0/0.24)]">
          <span className="flex items-start justify-between">
            <span aria-hidden className="text-[clamp(18px,17cqmin,30px)] leading-none">
              {front.emoji}
            </span>
            <span className="rounded-full bg-app-background px-[4cqmin] py-[1.5cqmin] text-[clamp(9px,6.4cqmin,11px)] font-semibold text-app-muted tabular-nums">
              1/{expertise.length}
            </span>
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="line-clamp-2 text-[clamp(12px,9.2cqmin,15px)] leading-tight font-bold tracking-tight">{front.title}</span>
            <span className="mt-[2cqmin] truncate text-[clamp(9.5px,6.8cqmin,12px)] font-medium text-app-muted">
              +{expertise.length - 1} more areas
            </span>
          </span>
        </span>
      </span>
      <span className="icon-label">Expertise</span>
    </button>
  );
}

/** Weeks of history the server sends (`HEATMAP_WEEKS` in lib/github.ts, which is server-only). */
const WEEKS = 34;

/** No data: an empty grid ending today, so the widget keeps its shape. */
function emptyDays(): ContributionDay[] {
  const today = new Date();
  const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (WEEKS - 1) * 7));
  const days: ContributionDay[] = [];
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1))
    days.push({ date: d.toISOString().slice(0, 10), level: 0, count: 0 });
  return days;
}

/**
 * 4×2: the GitHub contribution heatmap (Sunday-first columns, newest on the right): the last 17
 * weeks, or 26 or 34 in a wide, short tile (a phone on its side) so the squares stay big. Squares
 * fade in column by column the first time the widget comes into view; today's square breathes.
 */
export function GitHubWidget() {
  const { contributions } = useServerData();
  const user = contributions?.user ?? profile.github;
  const days = contributions?.days.length ? contributions.days : emptyDays();
  const total = contributions?.total ?? null;
  const ref = useRef<HTMLAnchorElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.intersectionRatio > 0.6)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  const first = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const lastCol = Math.floor((days.length - 1 + first) / 7);
  const label =
    total !== null
      ? `GitHub: ${total.toLocaleString("en-US")} contributions in the last year. Open ${user} on GitHub (opens in a new tab)`
      : `GitHub: ${user}. View on GitHub (opens in a new tab)`;

  return (
    <a
      ref={ref}
      href={`https://github.com/${user}`}
      target="_blank"
      rel="noopener noreferrer"
      data-nav
      data-github-widget
      aria-label={label}
      className={OUTER}
    >
      <span
        data-widget-tile
        data-shown={shown || undefined}
        className={`${TILE} gh-heat flex flex-col gap-[2.2cqw] bg-app-surface p-[3.6cqw] text-app-ink shadow-[0_4px_14px_rgb(0_0_0/0.18)]`}
      >
        <span className="flex items-center gap-2">
          <BrandGlyph mark={github} className="size-[18px] shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight">{user}</span>
          {total !== null ? (
            <span className="text-right leading-none whitespace-nowrap">
              <span className="text-[15px] font-bold tabular-nums">{total.toLocaleString("en-US")}</span>
              <span className="ml-1 text-[11px] font-medium text-app-muted">this year</span>
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-app-muted">View on GitHub</span>
          )}
        </span>
        <span aria-hidden className="gh-grid">
          {days.map((d, i) => {
            // Placed from the right edge, in weeks before this one; older weeks only show when the tile is wide
            const age = lastCol - Math.floor((i + first) / 7);
            const row = (i + first) % 7;
            const range = age >= 26 ? " gh-wider" : age >= 17 ? " gh-wide" : "";
            return (
              <span
                key={d.date}
                data-level={d.level}
                className={`gh-cell${range}${i === days.length - 1 ? " gh-today" : ""}`}
                style={{ gridColumn: `${-age - 2} / ${-age - 1}`, gridRow: row + 1, "--age": age } as CSSProperties}
              />
            );
          })}
        </span>
      </span>
      <span className="icon-label">GitHub</span>
    </a>
  );
}

/** The widgets that load after hydration (Impact and Work with me ship with page 1). */
export function HomeWidget({ id }: { id: WidgetId }) {
  if (id === "github") return <GitHubWidget />;
  if (id === "blog") return <BlogWidget />;
  if (id === "youtube") return <VideoWidget />;
  if (id === "expertise") return <ExpertiseStack />;
  return null;
}
