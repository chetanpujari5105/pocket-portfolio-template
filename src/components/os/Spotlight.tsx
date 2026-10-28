"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, useMotionValueEvent, useTransform } from "motion/react";
import * as m from "motion/react-m";

import { appsLayout, askApp } from "@content/apps";
import { courses } from "@content/courses";
import { expertise } from "@content/expertise";
import { platforms } from "@content/platforms";
import { projects } from "@content/projects";
import type { AppId, HomeItem } from "@content/schema";
import { services } from "@content/services";
import { searchProgress, springs } from "@/lib/motion";
import { ENABLE_ASK, openApp } from "@/lib/router";
import { prefersReducedMotion, useOS } from "@/lib/store";
import { cn } from "@/lib/utils";

import { Glyph } from "./icons";
import { useServerData } from "./server-data";

type Entry = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  keywords?: string;
  run: () => void;
};

const external = (url: string) => () => window.open(url, "_blank", "noopener,noreferrer");

/** Subsequence fuzzy match: rewards contiguous runs and word starts. Lower is better. */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const t = text.toLowerCase();
  const direct = t.indexOf(q);
  if (direct !== -1) return direct === 0 || t[direct - 1] === " " ? direct * 0.1 : 5 + direct * 0.1;
  let score = 10;
  let ti = 0;
  let prev = -2;
  for (const ch of q) {
    if (ch === " ") continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;
    score += found === prev + 1 ? 0.5 : found - ti + 2;
    if (found === 0 || t[found - 1] === " ") score -= 1.5;
    prev = found;
    ti = found + 1;
  }
  return score;
}

export function Spotlight() {
  const open = useOS((s) => s.spotlightOpen);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useOS.getState().setSpotlightOpen(!useOS.getState().spotlightOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Opening/closing (button, ⌘K, Esc) animates the same progress a pull-down drives by hand.
  const [visible, setVisible] = useState(false);
  useMotionValueEvent(searchProgress, "change", (v) => setVisible(v > 0.002));
  useEffect(() => {
    const c = animate(searchProgress, open ? 1 : 0, prefersReducedMotion() ? { duration: 0.15 } : springs.smooth);
    return () => c.stop();
  }, [open]);

  // Mounted only while visible, so the query resets every time.
  return open || visible ? <SpotlightPanel open={open} /> : null;
}

function SpotlightPanel({ open }: { open: boolean }) {
  // The field follows the finger down; the home screen blurs and dims in proportion.
  const backdrop = useTransform(searchProgress, [0, 1], [0, 1]);
  const panelY = useTransform(searchProgress, (p) => (1 - Math.min(p, 1)) * -56 + Math.max(0, p - 1) * 40);
  const panelOpacity = useTransform(searchProgress, [0, 0.6], [0, 1]);
  const setOpen = useOS((s) => s.setSpotlightOpen);
  const { posts } = useServerData();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const appBefore = useOS.getState().route.app;
    inputRef.current?.focus({ preventScroll: true });
    // Hand focus back on close, unless a result opened an app (its window takes focus)
    return () => {
      if (useOS.getState().route.app === appBefore && previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const apps: HomeItem[] = [...appsLayout.block, ...appsLayout.row, ...appsLayout.dock, ...(ENABLE_ASK ? [askApp] : [])];
    return [
      ...apps.map((a) => ({
        id: `app-${a.id}`,
        kind: "Apps",
        title: a.label,
        run: a.href ? external(a.href) : () => openApp(a.app as AppId),
      })),
      ...courses.map((c) => ({
        id: `course-${c.id}`,
        kind: "Courses",
        title: c.title,
        subtitle: `${c.platform} · ${c.badge}`,
        keywords: c.category,
        run: () => openApp("courses", c.id),
      })),
      ...projects.map((p) => ({
        id: `project-${p.id}`,
        kind: "Projects",
        title: p.name,
        subtitle: p.tagline,
        keywords: `${p.category} ${p.stack.join(" ")}`,
        run: () => openApp("projects", p.id),
      })),
      ...posts.map((p) => ({
        id: `post-${p.url}`,
        kind: "Blog",
        title: p.title,
        subtitle: p.subtitle,
        run: external(p.url),
      })),
      ...expertise.map((x) => ({
        id: `exp-${x.id}`,
        kind: "Expertise",
        title: x.title,
        keywords: x.tools.join(" "),
        run: () => openApp("expertise", x.id),
      })),
      ...services.map((s) => ({
        id: `svc-${s.id}`,
        kind: "Services",
        title: s.title,
        subtitle: s.description.slice(0, 70) + "…",
        run: () => openApp("services"),
      })),
      ...platforms.primary.map((p) => ({
        id: `plat-${p.name}`,
        kind: "Platforms",
        title: p.name,
        run: p.url ? external(p.url) : () => openApp("platforms"),
      })),
    ];
  }, [posts]);

  const results = useMemo(() => {
    if (!query.trim()) return entries.filter((e) => e.kind === "Apps");
    return entries
      .map((e) => {
        const a = fuzzyScore(query, e.title);
        const b = e.keywords ? fuzzyScore(query, e.keywords) : null;
        const score = a === null ? (b === null ? null : b + 3) : b === null ? a : Math.min(a, b + 3);
        return { e, score };
      })
      .filter((r): r is { e: Entry; score: number } => r.score !== null)
      .sort((x, y) => x.score - y.score)
      .slice(0, 12)
      .map((r) => r.e);
  }, [entries, query]);

  const run = (entry: Entry | undefined) => {
    if (!entry) return;
    setOpen(false);
    entry.run();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className={cn("absolute inset-0 z-60 flex flex-col", !open && "pointer-events-none")}
    >
      <m.button
        type="button"
        tabIndex={-1}
        aria-label="Close search"
        onClick={() => setOpen(false)}
        style={{ opacity: backdrop }}
        className="absolute inset-0 bg-black/30 backdrop-blur-[22px]"
      />
      <m.div
        style={{ y: panelY, opacity: panelOpacity }}
        className="relative mx-4 mt-[max(env(safe-area-inset-top),14px)] tab:mt-[7.5cqh]"
      >
        <label className="glass flex h-11 items-center gap-2 rounded-[14px] px-3 text-app-ink shadow-lg">
          <Glyph name="search" className="size-4 text-app-muted" />
          <span className="sr-only">Search apps, courses, projects and posts</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(results[active]);
              }
            }}
            placeholder="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="spotlight-results"
            aria-activedescendant={results[active] ? `sl-${results[active].id}` : undefined}
            className="h-full flex-1 bg-transparent text-[16px] outline-none placeholder:text-app-muted"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded-md border border-app-divider px-1.5 text-[11px] text-app-muted desk:inline">esc</kbd>
        </label>

        <ul
          id="spotlight-results"
          role="listbox"
          aria-label="Results"
          className="no-scrollbar glass mt-2 max-h-[64cqh] overflow-y-auto overscroll-contain rounded-[14px] p-1.5 text-app-ink shadow-lg"
        >
          {results.length === 0 && <li className="px-3 py-3 text-[14px] text-app-muted">No results for “{query}”</li>}
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`sl-${r.id}`}
              role="option"
              aria-selected={i === active}
              onPointerEnter={() => setActive(i)}
              onClick={() => run(r)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2",
                i === active && "bg-app-divider/60",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-medium">{r.title}</span>
                {r.subtitle && <span className="block truncate text-[12px] text-app-muted">{r.subtitle}</span>}
              </span>
              <span className="shrink-0 text-[11px] font-medium text-app-muted">{r.kind}</span>
            </li>
          ))}
        </ul>
      </m.div>
    </div>
  );
}
