"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import * as m from "motion/react-m";
import { useDrag } from "@use-gesture/react";

import { appsLayout, askApp } from "@content/apps";
import type { HomeItem } from "@content/schema";
import { startedIn } from "@/lib/gesture";
import {
  animateTo,
  HOME_SCALE_OPEN,
  haptic,
  homePagerX,
  project,
  rubberBand,
  rubberClamp,
  searchProgress,
  springs,
  useRecede,
  withVelocity,
} from "@/lib/motion";
import { ENABLE_ASK } from "@/lib/router";
import { prefersReducedMotion, useOS } from "@/lib/store";

import { AppIcon } from "./AppIcon";
import { Glyph } from "./icons";
import { ImpactWidget } from "./ImpactWidget";
import { BrandGlyph } from "./BrandIcon";
import { SOCIAL_MARK, FOLDER_SOCIALS } from "./social-icons";
import { WorkWidget } from "./WorkWidget";

// Page 2 starts off-screen: its widgets (and next/image) load right after hydration
const Widgets = dynamic(() => import("./HomeWidgets").then((mod) => mod.WidgetsPage), { ssr: false });

const LONG_PRESS_MS = 500;
const PAGES = 2;
/** Pull this far (px) to fully open Search. */
const SEARCH_PULL = 140;

const REORDERABLE: HomeItem[] = [...appsLayout.block, ...appsLayout.row, ...appsLayout.links];
const DEFAULT_ORDER = REORDERABLE.map((i) => i.id);

/** Saved order, made valid against the current set of icons. */
function useIconOrder() {
  const saved = useOS((s) => s.iconOrder);
  return useMemo(() => {
    if (!saved) return DEFAULT_ORDER;
    const known = saved.filter((id) => DEFAULT_ORDER.includes(id));
    return [...known, ...DEFAULT_ORDER.filter((id) => !known.includes(id))];
  }, [saved]);
}

function FolderTile() {
  return (
    <span className="icon-content grid size-full grid-cols-3 content-center gap-[8%] p-[15%]">
      {FOLDER_SOCIALS.slice(0, 9).map((id) => {
        const mark = SOCIAL_MARK[id];
        return (
          <span key={id} className="squircle grid aspect-square place-items-center" style={{ background: mark.tile.bg, color: mark.tile.fg }}>
            <BrandGlyph mark={mark} className="size-[58%]" />
          </span>
        );
      })}
    </span>
  );
}

function iconFor(item: HomeItem, showLabel = true) {
  if (item.id === "socials")
    return (
      <AppIcon
        item={{ ...item, colors: ["rgb(255 255 255 / 0.28)", "rgb(255 255 255 / 0.16)"] }}
        tile={<FolderTile />}
        className="icon-folder"
        showLabel={showLabel}
      />
    );
  return <AppIcon item={item} showLabel={showLabel} />;
}

/** Moves focus to the nearest home item in the arrow's direction; past the edge, turns the page. */
function moveFocus(event: KeyboardEvent<HTMLDivElement>, goToPage: (page: number, focus: "first" | "last") => void) {
  const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (!dir || event.ctrlKey || event.metaKey) return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-nav]")].filter((el) => !el.closest("[inert]"));
  const current = document.activeElement as HTMLElement | null;
  if (!current || !items.includes(current)) return;
  event.preventDefault();
  const from = current.getBoundingClientRect();
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  // Only items fully past the current item's edge in that direction
  const ahead = (r: DOMRect) =>
    dir[0] > 0 ? r.left >= from.right - 4 : dir[0] < 0 ? r.right <= from.left + 4 : dir[1] > 0 ? r.top >= from.bottom - 4 : r.bottom <= from.top + 4;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const item of items) {
    if (item === current) continue;
    const r = item.getBoundingClientRect();
    if (!ahead(r)) continue;
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - cy;
    const score = dx * dir[0] + dy * dir[1] + (Math.abs(dx * dir[1]) + Math.abs(dy * dir[0])) * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }
  if (best) best.focus();
  else if (dir[0] && current.closest("[data-home-page]")) {
    const page = useOS.getState().homePage + dir[0];
    if (page >= 0 && page < PAGES) goToPage(page, dir[0] > 0 ? "first" : "last");
  }
}

export function HomeScreen({ open }: { open: boolean }) {
  const wiggle = useOS((s) => s.wiggle);
  const setWiggle = useOS((s) => s.setWiggle);
  const page = useOS((s) => s.homePage);
  const locked = useOS((s) => s.locked);
  const order = useIconOrder();
  const layerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const width = useRef(390);
  const suppressClick = useRef(false);
  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);

  // Recedes behind an open app: scale 0.9, dim and a slight blur, all on the launch spring
  const recede = useRecede();
  const transform = useTransform(recede, (r) => (r < 0.001 ? "none" : `scale(${1 - (1 - HOME_SCALE_OPEN) * r})`));
  const filter = useTransform(recede, (r) => (r < 0.01 ? "none" : `blur(${r * 3}px)`));
  const dim = useTransform(recede, [0, 1], [0, 0.3]);

  // Pager geometry follows the screen width.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      width.current = el.clientWidth;
      homePagerX.set(-useOS.getState().homePage * width.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goToPage = (next: number, focus?: "first" | "last", velocity = 0) => {
    const p = Math.max(0, Math.min(PAGES - 1, next));
    useOS.getState().setHomePage(p);
    animateTo(homePagerX, -p * width.current, prefersReducedMotion() ? { duration: 0 } : withVelocity("smooth", velocity));
    if (focus)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const items = layerRef.current?.querySelectorAll<HTMLElement>(`[data-home-page="${p}"] [data-nav]`);
          (focus === "first" ? items?.[0] : items?.[items.length - 1])?.focus({ preventScroll: true });
        }),
      );
  };

  /* ───── Pager + pull-down Search (one gesture, locked to the first direction) ───── */
  const pullSearch = (amount: number) =>
    searchProgress.set(Math.max(0, Math.min(1.12, rubberBand(amount, SEARCH_PULL * 1.6) / SEARCH_PULL)));
  const settleSearch = (velocity: number) => {
    if (searchProgress.get() > 0.5 || velocity > 500) useOS.getState().setSpotlightOpen(true);
    else animateTo(searchProgress, 0, withVelocity("snappy", -velocity / SEARCH_PULL));
  };
  useDrag(
    (s) => {
      const { first, last, tap, axis, movement, velocity, direction, event, cancel, memo } = s;
      if (tap) return;
      if (first && ((wiggle && startedIn(event, "[data-reorder]")) || startedIn(event, "[data-dock], [data-no-swipe]"))) {
        cancel();
        return;
      }
      if (first) window.clearTimeout(press.current?.timer);
      suppressClick.current = true;
      if (axis === "x") {
        const base = (memo as number | undefined) ?? homePagerX.get();
        const W = width.current;
        homePagerX.set(rubberClamp(base + movement[0], -(PAGES - 1) * W, 0, W * 0.35));
        if (last) {
          const vx = velocity[0] * direction[0] * 1000;
          goToPage(Math.round(-(homePagerX.get() + project(vx, 0.99)) / W), undefined, vx);
        }
        return base;
      }
      if (axis === "y" && !wiggle) {
        pullSearch(Math.max(0, movement[1]));
        if (last) settleSearch(velocity[1] * direction[1] * 1000);
      }
    },
    { target: layerRef, axis: "lock", filterTaps: true, threshold: 10, pointer: { capture: true }, enabled: !open && !locked },
  );

  // Trackpad: horizontal scroll pages; scrolling "up" pulls Search down.
  const wheel = useRef({ dx: 0, dy: 0, base: 0, timer: 0 });
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (open || useOS.getState().locked || useOS.getState().spotlightOpen) return;
      const w = wheel.current;
      if (!w.timer) {
        w.dx = 0;
        w.dy = 0;
        w.base = homePagerX.get();
      }
      window.clearTimeout(w.timer);
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        w.dx -= e.deltaX;
        const W = width.current;
        homePagerX.set(rubberClamp(w.base + w.dx, -(PAGES - 1) * W, 0, W * 0.35));
      } else if (e.deltaY < 0 || w.dy > 0) {
        w.dy = Math.max(0, w.dy - e.deltaY);
        pullSearch(w.dy * 0.8);
      }
      w.timer = window.setTimeout(() => {
        w.timer = 0;
        const W = width.current;
        const current = useOS.getState().homePage;
        if (Math.abs(w.dx) > W * 0.12) goToPage(current + (w.dx < 0 ? 1 : -1));
        else if (w.dx) goToPage(current);
        if (w.dy) settleSearch(0);
      }, 140);
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
     
  }, [open]);

  /* ───── Long-press → jiggle mode ───── */
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || wiggle) return;
    suppressClick.current = false;
    const state = { timer: 0, x: e.clientX, y: e.clientY, fired: false };
    state.timer = window.setTimeout(() => {
      state.fired = true;
      haptic();
      setWiggle(true);
    }, LONG_PRESS_MS);
    press.current = state;
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) window.clearTimeout(p.timer);
  };
  const endPress = () => window.clearTimeout(press.current?.timer);

  /* ───── Jiggle mode: drag icons to rearrange; the others reflow on springs ───── */
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const slots = useRef<{ x: number; y: number }[]>([]);
  // Where the icon was grabbed, relative to its centre, in layout px
  const grab = useRef({ x: 0, y: 0 });
  const shown = dragOrder ?? order;
  /** Pointer in grid layout px, read live so a phone that drifts (float, parallax) can't skew it. */
  const toGrid = (grid: HTMLElement, e: { clientX: number; clientY: number }) => {
    const r = grid.getBoundingClientRect();
    const scale = r.width / grid.offsetWidth || 1;
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };
  useDrag(
    (s) => {
      const { first, last, event, tap } = s;
      if (tap) return;
      const grid = gridRef.current;
      if (!grid) return;
      const pointer = toGrid(grid, { clientX: s.xy[0], clientY: s.xy[1] });
      if (first) {
        const el = (event.target as Element).closest<HTMLElement>("[data-reorder]");
        if (!el) {
          s.cancel();
          return;
        }
        // Slot centres in grid coordinates, ignoring transforms
        const items = [...grid.querySelectorAll<HTMLElement>("[data-reorder]")];
        slots.current = items.map((n) => ({ x: n.offsetLeft + n.offsetWidth / 2, y: n.offsetTop + n.offsetHeight / 2 }));
        const id = el.dataset.reorder!;
        const start = slots.current[order.indexOf(id)];
        // The gesture starts after the threshold, so subtract the movement so far
        const scale = grid.getBoundingClientRect().width / grid.offsetWidth || 1;
        grab.current = start
          ? { x: pointer.x - s.movement[0] / scale - start.x, y: pointer.y - s.movement[1] / scale - start.y }
          : { x: 0, y: 0 };
        setDragId(id);
        suppressClick.current = true;
      }
      const id = (s.memo as string | undefined) ?? (event.target as Element).closest<HTMLElement>("[data-reorder]")?.dataset.reorder;
      if (!id) return;
      const startIndex = order.indexOf(id);
      if (!slots.current[startIndex]) return id;
      const px = pointer.x - grab.current.x;
      const py = pointer.y - grab.current.y;
      let nearest = startIndex;
      let best = Infinity;
      slots.current.forEach((slot, i) => {
        const d = Math.hypot(slot.x - px, slot.y - py);
        if (d < best) {
          best = d;
          nearest = i;
        }
      });
      const next = order.filter((x) => x !== id);
      next.splice(nearest, 0, id);
      setDragOrder(next);
      dragX.set(px - slots.current[nearest].x);
      dragY.set(py - slots.current[nearest].y);
      if (last) {
        useOS.getState().setIconOrder(next);
        Promise.all([animateTo(dragX, 0, springs.smooth), animateTo(dragY, 0, springs.smooth)]).then(() => {
          setDragId(null);
          setDragOrder(null);
        });
      }
      return id;
    },
    { target: gridRef, enabled: wiggle, filterTaps: true, threshold: 3, pointer: { capture: true } },
  );

  const byId = (id: string) => REORDERABLE.find((i) => i.id === id)!;

  return (
    <m.div
      ref={layerRef}
      data-home-layer
      inert={open || locked}
      aria-hidden={open || undefined}
      style={{ transform, filter }}
      className="absolute inset-0 flex touch-none flex-col pt-[max(env(safe-area-inset-top),7.4cqh)] pb-[max(env(safe-area-inset-bottom),1.4cqh)] [--icon:min(62px,15.6cqw)] tab:pt-[7.4cqh]"
      data-wiggle={wiggle || undefined}
      data-locked={locked || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onClickCapture={(e) => {
        // A long-press, page swipe or rearrange shouldn't also open what it started on.
        if (press.current?.fired || suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
          if (press.current) press.current.fired = false;
          suppressClick.current = false;
          return;
        }
        if (wiggle && !(e.target as Element).closest("[data-wiggle-done]")) {
          e.preventDefault();
          e.stopPropagation();
          setWiggle(false);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        haptic();
        setWiggle(true);
      }}
      // A native link/image drag would steal the pointer from page swipes and rearranging.
      onDragStart={(e) => e.preventDefault()}
      onKeyDown={(e) => moveFocus(e, goToPage)}
    >
      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden">
        <m.div style={{ x: homePagerX }} className="flex h-full">
          <nav aria-label="Apps" data-home-page="0" inert={page !== 0} className="flex w-full shrink-0 flex-col px-[5.6cqw]">
            <div ref={gridRef} className="relative grid grid-cols-4 gap-x-[4.2cqw] gap-y-[2.3cqh]">
              <Fly>
                <ImpactWidget />
              </Fly>
              <Fly span>
                <WorkWidget />
              </Fly>
              {shown.map((id, i) => (
                <m.div
                  key={id}
                  data-reorder={id}
                  layout={dragId !== id}
                  transition={springs.smooth}
                  style={
                    dragId === id
                      ? ({ x: dragX, y: dragY, zIndex: 10, scale: 1.1 } as unknown as CSSProperties)
                      : ({ ["--wiggle-delay" as string]: `${-((i * 97) % 260)}ms` } as CSSProperties)
                  }
                  className="flex justify-center"
                  data-dragging={dragId === id || undefined}
                >
                  <div data-fly>{iconFor(byId(id))}</div>
                </m.div>
              ))}
              {ENABLE_ASK && (
                <div data-fly className="flex justify-center">
                  <AppIcon item={askApp} />
                </div>
              )}
            </div>
          </nav>
          <section aria-label="Widgets" data-home-page="1" inert={page !== 1} className="w-full shrink-0 px-[5.6cqw]">
            <div className="grid grid-cols-4 gap-x-[4.2cqw] gap-y-[2.3cqh]">
              <Widgets />
            </div>
          </section>
        </m.div>
      </div>

      <PageDots page={page} onPage={(p) => goToPage(p)} />

      <Dock />

      {wiggle && (
        <button
          type="button"
          data-wiggle-done
          onClick={() => setWiggle(false)}
          className="glass-dark absolute top-[max(env(safe-area-inset-top),6.4cqh)] right-[5cqw] rounded-full px-3 py-1 text-[13px] font-semibold text-white"
        >
          Done
        </button>
      )}

      <m.div aria-hidden style={{ opacity: dim }} className="pointer-events-none absolute inset-0 bg-black" />
    </m.div>
  );
}

/** Wrapper that marks an item for the unlock fly-in. */
function Fly({ children, span }: { children: ReactNode; span?: boolean }) {
  return (
    <div data-fly className={`flex *:w-full ${span ? "col-span-2 row-span-2" : "col-span-4"}`}>
      {children}
    </div>
  );
}

function PageDots({ page, onPage }: { page: number; onPage: (page: number) => void }) {
  const setSpotlightOpen = useOS((s) => s.setSpotlightOpen);
  return (
    <div className="flex justify-center pt-[1cqh] pb-[1.6cqh]" data-no-swipe>
      <div className="glass-chrome flex h-[28px] items-center gap-0.5 rounded-full pr-2 pl-0.5 text-white">
        <button
          type="button"
          data-nav
          aria-label="Search"
          onClick={() => setSpotlightOpen(true)}
          className="press-spring flex h-[26px] items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium tracking-[-0.01em]"
        >
          <Glyph name="search" className="size-[12px] opacity-90" />
          Search
        </button>
        {Array.from({ length: PAGES }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Page ${i + 1} of ${PAGES}`}
            aria-current={page === i ? "page" : undefined}
            onClick={() => onPage(i)}
            className="grid size-[14px] place-items-center"
          >
            <span className={`size-[6px] rounded-full transition-colors duration-200 ${page === i ? "bg-white" : "bg-white/35"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Frosted dock; on desktop the icons magnify toward the pointer (springs, max 1.15×). */
function Dock() {
  const mouseX = useMotionValue(Infinity);
  return (
    <nav
      aria-label="Dock"
      data-dock
      onPointerMove={(e) => e.pointerType === "mouse" && mouseX.set(e.clientX)}
      onPointerLeave={() => mouseX.set(Infinity)}
      className="glass-chrome mx-[4.1cqw] grid grid-cols-4 justify-items-center gap-x-[4.2cqw] rounded-[calc(var(--icon)*0.24+3.4cqw)] px-[4.9cqw] py-[1.7cqh]"
    >
      {appsLayout.dock.map((item) => (
        <DockItem key={item.id} mouseX={mouseX}>
          {iconFor(item, false)}
        </DockItem>
      ))}
    </nav>
  );
}

function DockItem({ mouseX, children }: { mouseX: MotionValue<number>; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const target = useTransform(mouseX, (x) => {
    const el = ref.current;
    if (!el || !Number.isFinite(x)) return 1;
    const r = el.getBoundingClientRect();
    const d = Math.abs(x - (r.left + r.width / 2)) / r.width;
    return 1 + 0.15 * Math.max(0, 1 - d / 1.6);
  });
  const scale = useSpring(target, springs.snappy);
  return (
    <m.div ref={ref} style={{ scale, transformOrigin: "50% 100%" }}>
      <div data-fly>{children}</div>
    </m.div>
  );
}
