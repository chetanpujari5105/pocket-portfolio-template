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
import { edgeZone, releaseVelocity, startedIn } from "@/lib/gesture";
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
const LayerCtx = createContext<"root" | "push" | "sheet">("root");

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
          <div ref={setSlot} className="relative flex h-[38px] items-center justify-between gap-2" />
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
      className="press-spring grid size-[34px] place-items-center rounded-full bg-app-group text-app-ink shadow-[0_0_0_0.5px_var(--app-divider)]"
    >
      <ChevronLeft className="size-5" strokeWidth={2.4} aria-hidden />
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
          className="min-w-0 flex-1 truncate text-center text-[16px] font-semibold tracking-tight"
        >
          {title}
        </m.span>
      )}
      {action && <span className="pointer-events-auto flex items-center gap-2">{action}</span>}
    </>
  );
  if (!screen) return <div className="flex h-[38px] items-center justify-between">{row}</div>;
  return (
    <>
      <div aria-hidden className="h-[38px]" />
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
        className="mt-2.5 text-[34px] leading-[1.08] font-bold tracking-[-0.02em]"
      >
        {title}
      </m.h1>
      {subtitle && <p className="mt-1 text-[14px] leading-snug text-app-muted">{subtitle}</p>}
    </header>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-6 mb-2 px-4 text-[13px] font-medium tracking-wide text-app-muted uppercase first:mt-0">
      {children}
    </h2>
  );
}

/** Grouped list card with inset hairline dividers. */
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
      <div className="overflow-hidden rounded-[14px] bg-app-group">
        {rows.map((row, i) => (
          <div key={i} className="relative">
            {row}
            {i < rows.length - 1 && (
              <span aria-hidden className="pointer-events-none absolute right-0 bottom-0 left-4 z-1 h-[0.5px] bg-app-divider" />
            )}
          </div>
        ))}
      </div>
      {footer && <p className="mt-2 px-4 text-[12.5px] leading-snug text-app-muted">{footer}</p>}
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
        <span className="block text-[15.5px] leading-snug font-medium">{title}</span>
        {subtitle && <span className="mt-0.5 block text-[13px] leading-snug text-app-muted">{subtitle}</span>}
      </span>
      {trailing}
      {chevron && <ChevronRight className="size-4 shrink-0 text-app-muted" aria-hidden />}
      {href && !chevron && !trailing && <ExternalLink className="size-3.5 shrink-0 text-app-muted" aria-hidden />}
    </>
  );
  const classes = cn(
    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150",
    (onClick || href) && "active:bg-app-divider/40",
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

/* ───────────────────────── Swipe actions ───────────────────────── */

const ACTION_W = 84;
/** Only one row stays open at a time. */
let closeOpenRow: (() => void) | null = null;

/**
 * A list row that swipes left to reveal an action. Swipe past ~55% (or flick) to run it outright.
 * The action stays reachable without the gesture elsewhere in each app (a visible button).
 */
export function SwipeRow({
  children,
  label,
  icon,
  onAction,
  className,
}: {
  children: ReactNode;
  label: string;
  icon?: ReactNode;
  onAction: () => void;
  className?: string;
}) {
  const x = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const [open, setOpen] = useState(false);
  const actionWidth = useTransform(x, (v) => Math.max(ACTION_W, -v));
  const labelOpacity = useTransform(x, [-ACTION_W * 0.4, -ACTION_W], [0, 1]);

  const close = useCallback(() => {
    animate(x, 0, springs.snappy);
    setOpen(false);
  }, [x]);
  useEffect(() => () => {
    if (closeOpenRow === close) closeOpenRow = null;
  }, [close]);

  useDrag(
    (s) => {
      const el = ref.current;
      if (!el || s.tap) return;
      const W = el.offsetWidth;
      const k = scaleOf(el);
      if (s.first) {
        dragged.current = true;
        if (closeOpenRow && closeOpenRow !== close) closeOpenRow();
      }
      const base = (s.memo as number | undefined) ?? x.get();
      const next = base + s.movement[0] / k;
      x.set(next > 0 ? rubberBand(next, W * 0.5) : Math.max(next, -W));
      if (s.last) {
        const v = releaseVelocity(s, 0) / k;
        const end = x.get() + project(v, 0.99);
        if (x.get() < -W * 0.55 || (end < -W * 0.8 && x.get() < -ACTION_W)) {
          haptic();
          onAction();
          animate(x, 0, withVelocity("smooth", v));
          setOpen(false);
        } else if (end < -ACTION_W / 2) {
          animate(x, -ACTION_W, withVelocity("snappy", v));
          setOpen(true);
          closeOpenRow = close;
        } else {
          animate(x, 0, withVelocity("snappy", v));
          setOpen(false);
        }
      }
      return base;
    },
    { target: ref, axis: "x", filterTaps: true, threshold: 8, pointer: { capture: true } },
  );

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <m.button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        onClick={() => {
          onAction();
          close();
        }}
        style={{ width: actionWidth }}
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-finish text-[13px] font-semibold text-finish-ink"
      >
        <m.span style={{ opacity: labelOpacity }} className="flex w-[84px] flex-col items-center gap-1">
          {icon}
          {label}
        </m.span>
      </m.button>
      <m.div
        ref={ref}
        data-swipe-row
        style={{ x }}
        className="relative touch-pan-y bg-app-group"
        onPointerDownCapture={() => {
          dragged.current = false;
        }}
        onClickCapture={(e) => {
          // A swipe, or a tap that closes an open row, shouldn't also press what's under it
          if (dragged.current || open) {
            e.preventDefault();
            e.stopPropagation();
            if (open && !dragged.current) close();
          }
          dragged.current = false;
        }}
      >
        {children}
      </m.div>
    </div>
  );
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

export function Pill({
  children,
  href,
  onClick,
  className,
  label,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  label?: string;
}) {
  const classes = cn(
    "press-spring inline-flex shrink-0 items-center justify-center rounded-full bg-finish px-4 py-1.5 text-[13.5px] font-bold text-finish-ink",
    className,
  );
  if (href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={classes}>
        {children}
      </a>
    );
  return (
    <button type="button" onClick={onClick} aria-label={label} className={classes}>
      {children}
    </button>
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
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-available" : "bg-app-divider",
      )}
    >
      <m.span
        animate={{ x: checked ? 20 : 0 }}
        transition={springs.snappy}
        initial={false}
        className="absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)]"
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
      <div role="radiogroup" aria-label={label} onKeyDown={onRadioGroupKeyDown} className="flex rounded-[10px] bg-app-divider/50 p-[2px]">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            tabIndex={value === o.value ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex-1 rounded-[8px] px-2 py-1.5 text-[13px] font-semibold transition-colors duration-150",
              value === o.value ? "text-app-ink" : "text-app-muted",
            )}
          >
            {value === o.value && (
              <m.span
                layoutId="segment-indicator"
                transition={springs.snappy}
                className="absolute inset-0 rounded-[8px] bg-app-group shadow-sm"
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
      <span className="text-app-divider">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

/* ───────────────────────── Sheets ───────────────────────── */

/**
 * Bottom sheet with medium and large detents. Drag the grabber (or the content from its top) and
 * it lands on the detent the flick is heading for; dragging below medium closes it. The app behind
 * scales to 0.94 with rounded corners. The grabber is also a button that toggles the detent; the
 * backdrop and Esc close it.
 */
export function Sheet({ open, children, label }: { open: boolean; children: ReactNode; label: string }) {
  const win = useWindowMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = usePresence(open);
  const y = useMotionValue(10_000);
  const fade = useMotionValue(1);
  const [expanded, setExpanded] = useState(false);
  // Each opening starts at the medium detent
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setExpanded(false);
  }
  const release = useRef(0);
  const openRef = useRef(open);
  const firstRun = useRef(true);
  const dragged = useRef(false);

  /** Offsets of the (92%-tall) panel below fully open: large, medium, closed. */
  const detents = useCallback(() => {
    const H = wrapRef.current?.clientHeight ?? 800;
    const panelH = H * 0.92;
    const contentH = (contentRef.current?.scrollHeight ?? panelH) + 26;
    const showLarge = Math.min(contentH, panelH);
    const showMedium = Math.min(showLarge, Math.max(H * 0.5, Math.min(contentH, H * 0.5)));
    return { large: panelH - showLarge, medium: panelH - showMedium, closed: panelH + 24 };
  }, []);

  const progress = useTransform(y, (v) => {
    const d = detents();
    return clamp01(1 - (v - d.medium) / (d.closed - d.medium));
  });

  useEffect(() => {
    if (!win || !mounted) return;
    const unsubscribe = progress.on("change", (p) => win.sheet.set(prefersReducedMotion() ? 0 : p));
    return () => {
      unsubscribe();
      win.sheet.set(0);
    };
  }, [win, progress, mounted]);

  useLayoutEffect(() => {
    openRef.current = open;
    const initial = firstRun.current;
    firstRun.current = false;
    const reduce = prefersReducedMotion();
    if (open) {
      const d = detents();
      if (initial) {
        // Deep link: already open
        y.set(d.medium);
        return;
      }
      if (reduce) {
        y.set(d.medium);
        fade.set(0);
        animate(fade, 1, fadeTransition);
        return;
      }
      if (y.get() > d.closed) y.set(d.closed);
      animate(y, d.medium, springs.smooth);
      return;
    }
    if (!mounted) return;
    const done = () => {
      if (!openRef.current) setMounted(false);
    };
    if (reduce) animate(fade, 0, fadeTransition).then(done);
    else animate(y, detents().closed, withVelocity("smooth", release.current)).then(done);
    release.current = 0;
    // `mounted` only gates the close; re-running on it would replay the open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detents, y, fade, setMounted]);

  const settle = (target: number, velocity: number) => {
    const d = detents();
    if (target === d.closed) {
      release.current = velocity;
      goBack();
      return;
    }
    animate(y, target, withVelocity("smooth", velocity));
    setExpanded(target === d.large && d.large < d.medium);
  };

  useDrag(
    (s) => {
      const panel = panelRef.current;
      if (!panel) return;
      const k = scaleOf(panel);
      const d = detents();
      if (s.first) {
        const content = contentRef.current;
        const fromGrabber = startedIn(s.event, "[data-grabber]");
        const atTop = (content?.scrollTop ?? 0) <= 0;
        const atLarge = Math.abs(y.get() - d.large) < 2;
        // At full height the content scrolls; it only drags the sheet when pulled down from its top
        if (!fromGrabber && atLarge && !(atTop && s.direction[1] > 0)) {
          s.cancel();
          return;
        }
        dragged.current = true;
      }
      const base = (s.memo as number | undefined) ?? y.get();
      const next = base + s.movement[1] / k;
      y.set(next < d.large ? d.large - rubberBand(d.large - next, d.closed) : next);
      if (s.last) {
        const v = releaseVelocity(s, 1) / k;
        const aim = y.get() + project(v, 0.99);
        const target = [d.large, d.medium, d.closed].reduce((a, b) => (Math.abs(b - aim) < Math.abs(a - aim) ? b : a));
        settle(target, v);
      }
      return base;
    },
    { target: panelRef, axis: "y", filterTaps: true, threshold: 6, pointer: { capture: true } },
  );

  // Scrolling down at medium grows the sheet first, like dragging it up
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !mounted) return;
    const onWheel = (e: WheelEvent) => {
      const d = detents();
      if (e.deltaY > 0 && !expanded && d.large < d.medium) {
        e.preventDefault();
        settle(d.large, 0);
      }
    };
    content.addEventListener("wheel", onWheel, { passive: false });
    return () => content.removeEventListener("wheel", onWheel);
  });

  if (!mounted) return null;
  return (
    <div ref={wrapRef} className="absolute inset-0 z-10" role="region" aria-label={label}>
      <m.button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={() => goBack()}
        style={{ opacity: prefersReducedMotion() ? fade : progress }}
        className="absolute inset-0 bg-black/30"
      />
      <LayerCtx.Provider value="sheet">
        <m.div
          ref={panelRef}
          data-sheet
          style={{ y, opacity: fade }}
          className="absolute inset-x-0 bottom-0 flex h-[92%] flex-col rounded-t-[26px] bg-app-background shadow-[0_-10px_40px_rgb(0_0_0/0.18)]"
        >
          <button
            type="button"
            data-grabber
            aria-label={expanded ? "Shrink sheet" : "Expand sheet"}
            onPointerDown={() => {
              dragged.current = false;
            }}
            onClick={() => {
              if (dragged.current) return;
              const d = detents();
              if (d.large >= d.medium) settle(d.closed, 0);
              else settle(expanded ? d.medium : d.large, 0);
            }}
            className="flex h-[26px] shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          >
            <span aria-hidden className="block h-[5px] w-10 rounded-full bg-app-divider" />
          </button>
          <div
            ref={contentRef}
            className={cn(
              "no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),28px)]",
              expanded ? "touch-pan-y" : "touch-none",
            )}
          >
            {children}
          </div>
        </m.div>
      </LayerCtx.Provider>
    </div>
  );
}
