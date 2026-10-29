"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { profile } from "@content/profile";
import { loadContributions } from "@/lib/contributions";
import type { ContributionDay, Contributions } from "@/lib/github";
import { homePagerX } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/store";

import { BrandGlyph } from "./BrandIcon";
import { github } from "./brand-marks";

const OUTER = "icon-press flex size-full flex-col items-center gap-[calc(var(--icon)*0.11)] select-none";
const TILE = "widget-press [container-type:size] relative min-h-0 w-full flex-1 overflow-hidden widget-r text-left";

/** Weeks of history the server sends (`HEATMAP_WEEKS` in lib/github.ts, which is server-only). */
const WEEKS = 34;
/** The column fade's last square lands after this (16 columns × 24 ms stagger + 360 ms). */
const FADE_MS = 800;


/** A square's place: weeks before the newest column (`age`) and weekday (`row`, Sunday first). */
type Cell = { key: string; age: number; row: number; day?: ContributionDay };

/** Before the data: every square of every column, so the grid has its real shape from the first paint. */
const SKELETON: Cell[] = Array.from({ length: WEEKS * 7 }, (_, i) => {
  const age = WEEKS - 1 - Math.floor(i / 7);
  const row = i % 7;
  return { key: `${age}-${row}`, age, row };
});

/** The days, placed from the right edge. Keys match the skeleton's, so the same squares just recolour. */
function cellsOf(days: ContributionDay[]): Cell[] {
  const first = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const lastCol = Math.floor((days.length - 1 + first) / 7);
  return days.map((day, i) => {
    const age = lastCol - Math.floor((i + first) / 7);
    const row = (i + first) % 7;
    return { key: `${age}-${row}`, age, row, day };
  });
}

/**
 * Plays the column-by-column fade once, when the widget's home page first slides into the screen,
 * read from the pager's own position (as the Pages' offscreen logic does), never from the
 * browser's visibility test, which misjudges the page inside the 3D phone's transform. On screen
 * at mount: it plays from mount. Squares are visible by default, so if this never runs they're
 * simply there; the attribute is set straight on the tile in the pager's change handler, before
 * that frame paints.
 */
function useColumnFade(tileRef: React.RefObject<HTMLSpanElement | null>) {
  useLayoutEffect(() => {
    const tile = tileRef.current;
    const page = tile?.closest<HTMLElement>("[data-home-page]");
    const grid = tile?.closest<HTMLElement>("[data-home-grid]");
    if (!tile || !page || !grid || prefersReducedMotion()) return;
    const index = Number(page.dataset.homePage);
    const onScreen = () => {
      const width = grid.clientWidth;
      const left = -homePagerX.get();
      return width > 0 && index * width < left + width - 0.5 && (index + 1) * width > left + 0.5;
    };
    let done: number | undefined;
    const play = () => {
      tile.setAttribute("data-shown", "");
      // Afterwards the animation is dropped, so moving the screen (into the 3D phone) can't replay it
      done = window.setTimeout(() => tile.setAttribute("data-faded", ""), FADE_MS);
    };
    if (onScreen()) {
      play();
      return () => window.clearTimeout(done);
    }
    const stop = homePagerX.on("change", () => {
      if (!onScreen()) return;
      stop();
      play();
    });
    return () => {
      stop();
      window.clearTimeout(done);
    };
  }, [tileRef]);
}

/**
 * 4×2: the GitHub contribution heatmap (Sunday-first columns, newest on the right): the last 17
 * weeks, or 26 or 34 in a wide, short tile (a phone on its side) so the squares stay big. It
 * paints a quiet grey grid of the same squares at once, then colours them when the data lands
 * (no layout shift). Squares fade in column by column the first time the page comes on screen;
 * today's square breathes.
 */
export function GitHubWidget() {
  const [data, setData] = useState<Contributions | null>(null);
  const tileRef = useRef<HTMLSpanElement>(null);
  useColumnFade(tileRef);
  useEffect(() => {
    let live = true;
    void loadContributions().then((c) => live && setData(c));
    return () => {
      live = false;
    };
  }, []);

  const user = data?.user ?? profile.github;
  const total = data?.total ?? null;
  const cells = data ? cellsOf(data.days) : SKELETON;
  // The snapshot's newest day isn't today, so it doesn't pulse
  const today = data?.source === "github" ? data.days.at(-1)?.date : undefined;
  const label =
    total !== null
      ? `GitHub: ${total.toLocaleString("en-US")} contributions in the last year. Open ${user} on GitHub (opens in a new tab)`
      : `GitHub: ${user}. View on GitHub (opens in a new tab)`;

  return (
    <a
      href={`https://github.com/${user}`}
      target="_blank"
      rel="noopener noreferrer"
      data-nav
      data-github-widget
      aria-label={label}
      className={OUTER}
    >
      <span
        ref={tileRef}
        data-widget-tile
        data-source={data?.source ?? "skeleton"}
        className={`${TILE} gh-heat widget-light flex flex-col gap-[2.2cqw] p-[clamp(11px,3.8cqw,14px)]`}
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
          {cells.map(({ key, age, row, day }) => {
            // Older weeks only show when the tile is wide
            const range = age >= 26 ? " gh-wider" : age >= 17 ? " gh-wide" : "";
            return (
              <span
                key={key}
                data-level={day?.level}
                className={`gh-cell${range}${day && day.date === today ? " gh-today" : ""}`}
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
