"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { expertise } from "@content/expertise";
import { profile } from "@content/profile";
import { setLaunchOrigin } from "@/lib/launch";
import { openApp } from "@/lib/router";

import type { ContributionDay } from "@/lib/github";

import { BrandGlyph } from "./BrandIcon";
import { github } from "./brand-marks";
import { Glyph } from "./icons";
import { useServerData } from "./server-data";

const slugOf = (url: string) => url.replace(/\/+$/, "").split("/").pop() || url;

/** Page 2, large: the latest Substack post. Opens it in Blog. */
export function BlogWidget() {
  const { posts } = useServerData();
  const post = posts[0];
  if (!post) return null;
  return (
    <button
      type="button"
      data-nav
      data-fly
      data-app-icon="blog"
      aria-label={`Latest post: ${post.title}. Open in Blog`}
      onClick={(e) => {
        setLaunchOrigin("blog", e.currentTarget.querySelector<HTMLElement>("[data-widget-tile]") ?? e.currentTarget);
        openApp("blog", slugOf(post.url));
      }}
      className="icon-press col-span-4 flex flex-col items-center gap-[5px] select-none"
    >
      <span
        data-widget-tile
        className="widget-press relative flex aspect-[2.05] w-full flex-col justify-end overflow-hidden widget-r bg-app-surface text-left text-white shadow-[0_4px_14px_rgb(0_0_0/0.18)]"
      >
        {post.image ? (
          <Image src={post.image} alt="" fill sizes="(max-width: 600px) 92vw, 380px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 bg-[linear-gradient(150deg,var(--accent),var(--accent-deep))]" />
        )}
        <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgb(0_0_0/0.55)_52%,rgb(0_0_0/0.88))]" />
        <span className="relative p-3.5">
          <span className="block text-[10px] font-bold tracking-wider text-white/80 uppercase">Latest on the blog</span>
          <span className="mt-0.5 line-clamp-2 text-[clamp(15px,4.6cqw,18px)] leading-tight font-bold tracking-tight">
            {post.title}
          </span>
        </span>
      </span>
      <span className="icon-label">Blog</span>
    </button>
  );
}

/** Page 2: latest YouTube video, or the channel when the feed is empty. */
export function VideoWidget() {
  const { video } = useServerData();
  const href = video?.url ?? profile.youtube;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-nav
      data-fly
      aria-label={video ? `Latest video: ${video.title} (opens YouTube in a new tab)` : "YouTube channel (opens in a new tab)"}
      className="icon-press col-span-2 flex flex-col items-center gap-[5px] select-none"
    >
      <span className="widget-press relative flex aspect-square w-full flex-col justify-between overflow-hidden widget-r bg-[linear-gradient(160deg,#2a0d0d,#0b0b0d)] p-3 text-left text-white shadow-[0_4px_14px_rgb(0_0_0/0.18)]">
        {video && <Image src={video.thumb} alt="" fill sizes="180px" className="object-cover opacity-80" />}
        <span className="relative grid size-8 place-items-center rounded-full bg-[#ff3b30] shadow-lg">
          <Glyph name="play" className="size-4" />
        </span>
        <span className="relative">
          <span className="block text-[10px] font-bold tracking-wider text-white/75 uppercase">
            {video ? "New video" : "YouTube"}
          </span>
          <span className="line-clamp-2 block text-[13px] leading-snug font-bold">
            {video ? video.title : profile.youtubeLine}
          </span>
        </span>
      </span>
      <span className="icon-label">YouTube</span>
    </a>
  );
}

/** Page 2: a fanned stack of expertise areas. Opens Expertise. */
export function ExpertiseStack() {
  const top = expertise.slice(0, 3);
  return (
    <button
      type="button"
      data-nav
      data-fly
      data-app-icon="expertise"
      aria-label={`Expertise: ${top.map((e) => e.title).join(", ")}. Open Expertise`}
      onClick={(e) => {
        setLaunchOrigin("expertise", e.currentTarget.querySelector<HTMLElement>("[data-widget-tile]") ?? e.currentTarget);
        openApp("expertise");
      }}
      className="icon-press col-span-2 flex flex-col items-center gap-[5px] select-none"
    >
      <span data-widget-tile className="widget-press relative aspect-square w-full">
        {top.map((area, i) => (
          <span
            key={area.id}
            className="absolute inset-x-0 flex h-[64%] flex-col justify-between rounded-[18px] bg-app-surface p-2.5 text-left text-app-ink shadow-[0_6px_16px_rgb(0_0_0/0.22)]"
            style={{
              top: `${i * 18}%`,
              transform: `scale(${0.86 + i * 0.07})`,
              zIndex: i,
              opacity: 0.75 + i * 0.125,
            }}
          >
            <span aria-hidden className="text-[20px] leading-none">
              {area.emoji}
            </span>
            <span className="line-clamp-2 text-[12px] leading-tight font-bold tracking-tight">{area.title}</span>
          </span>
        ))}
      </span>
      <span className="icon-label">Expertise</span>
    </button>
  );
}

const WEEKS = 17;

/** No data: an empty 17-week grid ending today, so the widget keeps its shape. */
function emptyDays(): ContributionDay[] {
  const today = new Date();
  const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (WEEKS - 1) * 7));
  const days: ContributionDay[] = [];
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1))
    days.push({ date: d.toISOString().slice(0, 10), level: 0, count: 0 });
  return days;
}

/**
 * Page 2, large: the GitHub contribution heatmap (last 17 weeks, Sunday-first columns). Squares
 * fade in column by column the first time page 2 comes into view; today's square breathes.
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
      data-fly
      data-github-widget
      aria-label={label}
      className="icon-press col-span-4 flex flex-col items-center gap-[5px] select-none"
    >
      <span
        data-shown={shown || undefined}
        className="widget-press gh-heat flex aspect-[2.05] w-full flex-col gap-[2.2cqw] overflow-hidden widget-r bg-app-surface p-[3.6cqw] text-left text-app-ink shadow-[0_4px_14px_rgb(0_0_0/0.18)]"
      >
        <span className="flex items-center gap-2">
          <BrandGlyph mark={github} className="size-[18px] shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight">{user}</span>
          {total !== null ? (
            <span className="text-right leading-none">
              <span className="text-[15px] font-bold tabular-nums">{total.toLocaleString("en-US")}</span>
              <span className="ml-1 text-[11px] font-medium text-app-muted">this year</span>
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-app-muted">View on GitHub</span>
          )}
        </span>
        <span aria-hidden className="gh-grid">
          {days.map((d, i) => {
            const col = Math.floor((i + first) / 7);
            const row = (i + first) % 7;
            return (
              <span
                key={d.date}
                data-level={d.level}
                className={i === days.length - 1 ? "gh-cell gh-today" : "gh-cell"}
                style={{ gridColumn: col + 1, gridRow: row + 1, "--col": col } as CSSProperties}
              />
            );
          })}
        </span>
      </span>
      <span className="icon-label">GitHub</span>
    </a>
  );
}

/** Everything on home page 2. */
export function WidgetsPage() {
  return (
    <>
      <GitHubWidget />
      <BlogWidget />
      <VideoWidget />
      <ExpertiseStack />
    </>
  );
}
