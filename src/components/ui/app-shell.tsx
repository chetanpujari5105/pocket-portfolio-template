"use client";

import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { animate, LayoutGroup, useMotionValue, useTransform, type MotionValue } from "motion/react";
import * as m from "motion/react-m";
import { useDrag } from "@use-gesture/react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { useWindowMotion } from "@/components/os/window-motion";
import { onRadioGroupKeyDown } from "@/lib/a11y";
import { edgeZone, releaseVelocity } from "@/lib/gesture";
import { fadeTransition, haptic, project, rubberBand, springs, withVelocity } from "@/lib/motion";
import { goBack } from "@/lib/router";
import { prefersReducedMotion } from "@/lib/store";
import { cnMerge as cn } from "@/lib/cn-merge";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Layout px of `el` from the top of `ancestor` (transforms ignored, so mid-launch reads are right). */
function offsetWithin(el: HTMLElement, ancestor: HTMLElement) {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}

/** Screen px per layout px for an element that may sit inside the scaled or 3D phone. */
const scaleOf = (el: HTMLElement) => el.getBoundingClientRect().width / el.offsetWidth || 1;

/* ───────────────────────── Screen: scroll physics + collapsing nav bar ───────────────────────── */

type ScreenState = {
  scrollY: MotionValue<number>;
  /** Overscroll past either end, rubber-banded: + pulled down at the top, − pushed up at the bottom */
  pull: MotionValue<number>;
  /** 0 → 1 as the large title slides under the bar; the bar's small title follows it */
  titleOpacity: MotionValue<number>;
  /** Where the bar's back button, title and actions render */
  slot: HTMLElement | null;
  setLargeTitle: (el: HTMLElement | null) => void;
};
const ScreenCtx = createContext<ScreenState | null>(null);

/** The layer a screen sits in: an app's root screen steps back as views stack over it. */
const LayerCtx = createContext<"root" | "push">("root");

/** Pull distance (after rubber-band) that starts a refresh, and where the content holds meanwhile. */
const REFRESH_AT = 64;
const REFRESH_HOLD = 52;
const WHEEL_IDLE_MS = 140;

/**
 * Scroll container for an app. Overscroll rubber-bands at both ends (wheel and touch) and springs
 * back; with `onRefresh`, pulling down far enough refreshes. A frosted bar holds the back button and
 * actions, and fades in the small title once the large one scrolls under it.
 */
export function AppScreen({
  children,
  className,
  onRefresh,
}: {
  children: ReactNode;
  className?: string;
  onRefresh?: () => Promise<unknown>;
}) {
  const layer = useContext(LayerCtx);
  const win = useWindowMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const scrollY = useMotionValue(0);
  const pull = useMotionValue(0);
  const titleOpacity = useMotionValue(0);
  const barOpacity = useMotionValue(0);
  const largeTitle = useRef<HTMLElement | null>(null);
  const collapseAt = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const refreshRef = useRef(onRefresh);
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  // The root screen steps back: −30% and dimmed under a pushed view, 0.94 and rounded under a sheet.
  const still = useMotionValue(0);
  const push = layer === "root" && win ? win.push : still;
  const sheet = layer === "root" && win ? win.sheet : still;
  const shiftX = useTransform(push, (p) => p * -0.3 * (win?.width() ?? 0));
  const scale = useTransform(sheet, [0, 1], [1, 0.94]);
  const radius = useTransform(sheet, [0, 1], [0, 16]);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const y = el.scrollTop;
    scrollY.set(y);
    const bar = barRef.current?.offsetHeight ?? 56;
    if (largeTitle.current && !collapseAt.current) {
      collapseAt.current = offsetWithin(largeTitle.current, el) + largeTitle.current.offsetHeight;
    }
    // Scroll offset at which the large title's baseline passes under the bar
    const at = (collapseAt.current || bar + 40) - bar;
    titleOpacity.set(clamp01((y - at + 12) / 14));
    barOpacity.set(clamp01((y - at + 28) / 20));
  }, [scrollY, titleOpacity, barOpacity]);

  // The on-screen keyboard shrinks the screen: bring the focused field back between the bar and
  // the keyboard (by scrolling this screen only; scrollIntoView would also shift the phone itself).
  useEffect(() => {
    const vv = window.visualViewport;
    const onResize = () =>
      requestAnimationFrame(() => {
        const scroller = scrollRef.current;
        const field = document.activeElement as HTMLElement | null;
        if (!scroller || !field || !scroller.contains(field) || !field.matches("input, textarea, select")) return;
        const box = scroller.getBoundingClientRect();
        const r = field.getBoundingClientRect();
        const top = box.top + (barRef.current?.offsetHeight ?? 56) + 8;
        const bottom = box.bottom - 12;
        if (r.top >= top && Math.min(r.bottom, r.top + 48) <= bottom) return;
        // Field top just under the bar, or as much of a tall field as fits
        scroller.scrollTop += r.top - top;
        update();
      });
    window.addEventListener("resize", onResize);
    vv?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      vv?.removeEventListener("resize", onResize);
    };
  }, [update]);

  const setLargeTitle = useCallback(
    (el: HTMLElement | null) => {
      largeTitle.current = el;
      collapseAt.current = 0;
      update();
    },
    [update],
  );

  const refresh = useCallback(async () => {
    busy.current = true;
    setRefreshing(true);
    haptic();
    animate(pull, REFRESH_HOLD, springs.snappy);
    try {
      await refreshRef.current?.();
    } catch {
      // The caller reports failures (status pill); the list stays as it was.
    }
    busy.current = false;
    setRefreshing(false);
    animate(pull, 0, springs.smooth);
  }, [pull]);

  /* Overscroll: wheel/trackpad and touch both feed `pull`, which springs back on release. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raw = 0;
    let timer = 0;
    const atTop = () => el.scrollTop <= 0;
    const atBottom = () => el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    const settle = (velocity = 0) => {
      raw = 0;
      if (busy.current) return;
      if (refreshRef.current && pull.get() >= REFRESH_AT) void refresh();
      else animate(pull, 0, withVelocity("snappy", velocity));
    };
    // A finger limits how far it can pull; trackpad momentum doesn't, so the wheel gets a tighter band
    const follow = (next: number, reach = el.clientHeight) => {
      raw = next;
      pull.stop();
      pull.set(rubberBand(raw, reach));
    };
    const wheelReach = () => Math.min(170, el.clientHeight * 0.22);

    const onWheel = (e: WheelEvent) => {
      if (busy.current || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (raw === 0 && !((atTop() && dy < 0) || (atBottom() && dy > 0))) return;
      const next = raw - dy;
      e.preventDefault();
      // Scrolling back the other way eats the overscroll first, then scrolls normally
      if (raw !== 0 && Math.sign(next) !== Math.sign(raw)) follow(0);
      else follow(next, wheelReach());
      window.clearTimeout(timer);
      timer = window.setTimeout(() => settle(), WHEEL_IDLE_MS);
    };

    let startY = 0;
    let tracking = false;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;
    const onTouchStart = (e: TouchEvent) => {
      tracking = false;
      startY = lastY = e.touches[0].clientY;
      lastT = e.timeStamp;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (busy.current || e.touches.length > 1) return;
      const y = e.touches[0].clientY;
      if (e.timeStamp > lastT) velocity = ((y - lastY) / (e.timeStamp - lastT)) * 1000;
      lastY = y;
      lastT = e.timeStamp;
      if (!tracking) {
        const dy = y - startY;
        if (!((atTop() && dy > 0) || (atBottom() && dy < 0))) return;
        tracking = true;
        startY = y;
      }
      const d = (y - startY) / scaleOf(el);
      if (raw !== 0 && Math.sign(d) !== Math.sign(raw)) {
        tracking = false;
        follow(0);
        return;
      }
      if (e.cancelable) e.preventDefault();
      follow(d);
    };
    const onTouchEnd = () => {
      if (!tracking) return;
      tracking = false;
      settle(velocity);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pull, refresh]);

  const spinOpacity = useTransform(pull, [12, REFRESH_AT], [0, 1]);
  const spinRotate = useTransform(pull, [0, REFRESH_AT], [0, 270]);
  const spinY = useTransform(pull, (p) => Math.max(0, p / 2 - 12));

  const ctx = useMemo<ScreenState>(
    () => ({ scrollY, pull, titleOpacity, slot, setLargeTitle }),
    [scrollY, pull, titleOpacity, slot, setLargeTitle],
  );

  return (
    <m.div
      style={{ x: shiftX, scale, borderRadius: radius, transformOrigin: "50% 0%" }}
      className="absolute inset-0 overflow-hidden bg-app-background"
    >
      <ScreenCtx.Provider value={ctx}>
        <div
          ref={barRef}
          className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-1.5 tab:pt-[7cqh]"
        >
          <m.div aria-hidden style={{ opacity: barOpacity }} className="nav-material absolute inset-0" />
          <div ref={setSlot} className="relative flex h-[44px] items-center justify-between gap-2" />
          {onRefresh && (
            <m.div
              style={{ opacity: refreshing ? 1 : spinOpacity, y: spinY }}
              className="absolute inset-x-0 top-full flex justify-center"
            >
              <m.svg
                aria-hidden
                viewBox="0 0 24 24"
                style={{ rotate: spinRotate }}
                className={cn("size-[22px] text-app-muted", refreshing && "animate-spin")}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M12 3a9 9 0 1 0 9 9" />
              </m.svg>
              {refreshing && (
                <span role="status" className="sr-only">
                  Refreshing
                </span>
              )}
            </m.div>
          )}
        </div>
        <div
          ref={scrollRef}
          onScroll={update}
          className={cn(
            "no-scrollbar absolute inset-0 overflow-y-auto overscroll-none pt-[max(env(safe-area-inset-top),12px)] pr-[max(16px,env(safe-area-inset-right))] pb-[max(64px,calc(env(safe-area-inset-bottom)+44px))] pl-[max(16px,env(safe-area-inset-left))] [contain:layout_paint] tab:pt-[7cqh] tab:[mask-image:linear-gradient(to_bottom,transparent_4.6cqh,black_6.8cqh)]",
            className,
          )}
        >
          {/* Landscape phones: a readable column, not a 800 px line length */}
          <m.div style={{ y: pull }} className="mx-auto w-full max-w-[680px]">
            {children}
          </m.div>
        </div>
      </ScreenCtx.Provider>
    </m.div>
  );
}

export function BackButton({ label = "Back", onClick = goBack }: { label?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press-spring glass-button grid size-[44px] place-items-center rounded-full text-app-ink"
    >
      <ChevronLeft className="size-[22px]" strokeWidth={2.4} aria-hidden />
    </button>
  );
}

/**
 * The screen's bar row: back button, the small title (fades in once the large title scrolls
 * under the bar) and actions. Renders into the AppScreen's frosted bar, so it never scrolls away.
 */
export function AppNav({
  title,
  backLabel = "Back to Home",
  action,
}: {
  title?: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  const screen = useContext(ScreenCtx);
  const row = (
    <>
      <span className="pointer-events-auto">
        <BackButton label={backLabel} />
      </span>
      {title && screen && (
        <m.span
          aria-hidden
          style={{ opacity: screen.titleOpacity }}
          className="min-w-0 flex-1 truncate text-center text-ios-headline font-semibold"
        >
          {title}
        </m.span>
      )}
      {action && <span className="pointer-events-auto flex items-center gap-2">{action}</span>}
    </>
  );
  if (!screen) return <div className="flex h-[44px] items-center justify-between">{row}</div>;
  return (
    <>
      <div aria-hidden className="h-[44px]" />
      {screen.slot && createPortal(row, screen.slot)}
    </>
  );
}

export function AppHeader({
  title,
  subtitle,
  action,
  backLabel = "Back to Home",
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  backLabel?: string;
}) {
  const screen = useContext(ScreenCtx);
  const h1 = useRef<HTMLHeadingElement>(null);
  const setLargeTitle = screen?.setLargeTitle;
  useLayoutEffect(() => {
    setLargeTitle?.(h1.current);
    return () => setLargeTitle?.(null);
  }, [setLargeTitle, title]);
  // Pulling down past the top grows the large title a little, anchored at its leading edge
  const still = useMotionValue(0);
  const scale = useTransform(screen?.pull ?? still, [0, 160], [1, 1.06], { clamp: true });
  return (
    <header className="mb-5">
      <AppNav title={title} backLabel={backLabel} action={action} />
      <m.h1
        ref={h1}
        style={{ scale, transformOrigin: "0% 50%" }}
        className="mt-2 text-ios-large-title font-bold"
      >
        {title}
      </m.h1>
      {subtitle && <p className="mt-0.5 text-ios-subheadline text-app-muted">{subtitle}</p>}
    </header>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-6 mb-1 px-4 pb-1.5 text-ios-headline font-semibold text-app-muted first:mt-0">
      {children}
    </h2>
  );
}

/** Inset grouped section (radius XXL) with opaque separators inset to the row's text. */
export function ListGroup({
  header,
  footer,
  children,
  className,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const rows = Children.toArray(children);
  return (
    <section className={cn("mb-6", className)}>
      {header && <SectionTitle>{header}</SectionTitle>}
      <div className="overflow-hidden rounded-ios-xxl bg-app-group">
        {rows.map((row, i) => (
          <div key={i} className="relative">
            {row}
            {i < rows.length - 1 && (
              <span aria-hidden className="pointer-events-none absolute right-0 bottom-0 left-4 z-1 h-[0.5px] bg-app-divider" />
            )}
          </div>
        ))}
      </div>
      {footer && <p className="mt-2 px-4 text-ios-footnote leading-[1rem] text-app-muted">{footer}</p>}
    </section>
  );
}

type RowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  chevron?: boolean;
  className?: string;
};

export function ListRow({ title, subtitle, leading, trailing, onClick, href, chevron, className }: RowProps) {
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-ios-body">{title}</span>
        {subtitle && <span className="block text-ios-subheadline text-app-muted">{subtitle}</span>}
      </span>
      {trailing}
      {chevron && (onClick || href) && <ChevronRight className="size-4 shrink-0 text-ios-label-tertiary" strokeWidth={2.6} aria-hidden />}
      {href && !chevron && !trailing && <ExternalLink className="size-3.5 shrink-0 text-app-muted" aria-hidden />}
    </>
  );
  const classes = cn(
    "flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150",
    (onClick || href) && "active:bg-ios-fill-tertiary",
    className,
  );
  if (href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {body}
      </a>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    );
  return <div className={classes}>{body}</div>;
}

/* ───────────────────────── Chips and segmented controls ───────────────────────── */

const ChipGroupCtx = createContext(false);

/** A row of filter chips; the active background slides between them on the snappy spring. */
export function ChipGroup({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <LayoutGroup id={id}>
      <ChipGroupCtx.Provider value>
        <div role="group" aria-label={label} className={className}>
          {children}
        </div>
      </ChipGroupCtx.Provider>
    </LayoutGroup>
  );
}

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const grouped = useContext(ChipGroupCtx);
  const classes = cn(
    "relative inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ease-out",
    grouped
      ? cn("bg-app-group", active ? "text-app-background" : "text-app-secondary")
      : active
        ? "bg-app-ink text-app-background"
        : "bg-app-group text-app-secondary",
    onClick && "press-spring",
    className,
  );
  const body = (
    <>
      {grouped && active && (
        <m.span layoutId="chip-indicator" transition={springs.snappy} className="absolute inset-0 rounded-full bg-app-ink" />
      )}
      <span className="relative">{children}</span>
    </>
  );
  return onClick ? (
    <button type="button" aria-pressed={active} onClick={onClick} className={classes}>
      {body}
    </button>
  ) : (
    <span className={classes}>{body}</span>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[28px] w-[64px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-ios-green" : "bg-ios-label-tertiary",
      )}
    >
      <m.span
        animate={{ x: checked ? 21 : 0 }}
        transition={springs.snappy}
        initial={false}
        className="absolute top-[2px] left-[2px] h-[24px] w-[39px] rounded-full bg-white shadow-[0_1px_4px_rgb(0_0_0/0.18)]"
      />
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const id = useId();
  return (
    <LayoutGroup id={id}>
      <div role="radiogroup" aria-label={label} onKeyDown={onRadioGroupKeyDown} className="flex h-8 gap-1 rounded-full bg-ios-fill-tertiary p-[2px]">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            tabIndex={value === o.value ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex-1 rounded-full px-2 text-[0.8125rem] font-semibold text-app-ink transition-colors duration-150",
            )}
          >
            {value === o.value && (
              <m.span
                layoutId="segment-indicator"
                transition={springs.snappy}
                className="absolute inset-0 rounded-full bg-ios-segmented-selected shadow-[0_2px_8px_rgb(0_0_0/0.1)]"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}

/** Remembers the last non-null value, so a closing detail view keeps its content while it slides out. */
export function useLastValue<T>(value: T | null): T | null {
  const [last, setLast] = useState(value);
  if (value !== null && value !== last) setLast(value);
  return value ?? last;
}

/** Stays mounted from `open` until its exit animation reports done. */
function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  return [mounted, setMounted] as const;
}

/* ───────────────────────── Push views ───────────────────────── */

/**
 * Detail view that slides in from the right; its parent shifts left 30% and dims. Swipe from the
 * left edge to go back interactively (the release velocity carries into the close). Back, Esc and the
 * browser all use the same close.
 */
export function PushView({ open, children, label }: { open: boolean; children: ReactNode; label: string }) {
  const win = useWindowMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = usePresence(open);
  const width = useCallback(() => win?.width() ?? panelRef.current?.offsetWidth ?? 400, [win]);
  // Off-screen until it opens; a deep link opens it in place
  const x = useMotionValue(open ? 0 : 10_000);
  const fade = useMotionValue(1);
  const dim = useTransform(x, (v) => clamp01(1 - v / width()));
  const release = useRef(0);
  const openRef = useRef(open);
  const firstRun = useRef(true);

  useEffect(() => {
    if (!win) return;
    const unsubscribe = dim.on("change", (p) => win.push.set(prefersReducedMotion() ? 0 : p));
    win.push.set(prefersReducedMotion() ? 0 : dim.get());
    return () => {
      unsubscribe();
      win.push.set(0);
    };
  }, [win, dim]);

  useEffect(() => {
    openRef.current = open;
    const initial = firstRun.current;
    firstRun.current = false;
    if (initial) return;
    const reduce = prefersReducedMotion();
    if (open) {
      if (reduce) {
        x.set(0);
        fade.set(0);
        animate(fade, 1, fadeTransition);
        return;
      }
      if (x.get() > width()) x.set(width());
      animate(x, 0, springs.smooth);
      return;
    }
    const done = () => {
      if (!openRef.current) setMounted(false);
    };
    if (reduce) animate(fade, 0, fadeTransition).then(done);
    else animate(x, width(), withVelocity("smooth", release.current)).then(done);
    release.current = 0;
  }, [open, x, fade, width, setMounted]);

  useDrag(
    (s) => {
      const el = panelRef.current;
      if (!el) return;
      const k = scaleOf(el);
      if (s.first) {
        const left = (s.initial[0] - el.getBoundingClientRect().left) / k;
        const [from, to] = edgeZone();
        if (left < from || left > to || prefersReducedMotion() || !openRef.current) {
          s.cancel();
          return;
        }
      }
      x.set(Math.max(0, s.movement[0] / k));
      if (s.last) {
        const v = releaseVelocity(s, 0) / k;
        if (x.get() + project(v, 0.99) > width() / 2) {
          release.current = v;
          goBack();
        } else animate(x, 0, withVelocity("smooth", v));
      }
    },
    { target: panelRef, axis: "x", filterTaps: true, threshold: 6, pointer: { capture: true } },
  );

  if (!mounted) return null;
  return (
    <>
      <m.div aria-hidden style={{ opacity: dim }} className="pointer-events-none absolute inset-0 z-10 bg-black/20" />
      <LayerCtx.Provider value="push">
        <m.div
          ref={panelRef}
          role="region"
          aria-label={label}
          data-push-view
          style={{ x, opacity: fade }}
          className="absolute inset-0 z-10 touch-pan-y bg-app-background shadow-[-12px_0_32px_rgb(0_0_0/0.12)]"
        >
          {children}
        </m.div>
      </LayerCtx.Provider>
    </>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-[13px] tracking-[2px] text-finish">
      {"★".repeat(rating)}
      <span className="text-ios-gray-4">{"★".repeat(5 - rating)}</span>
    </span>
  );
}
