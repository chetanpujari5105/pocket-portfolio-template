"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useMotionValue, useSpring, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useDrag } from "@use-gesture/react";

import { appsLayout } from "@content/apps";
import { profile } from "@content/profile";
import { latestReel, lockProjectId } from "@content/lock-notes";
import { projects } from "@content/projects";
import { setLaunchOrigin } from "@/lib/launch";
import { animateTo, haptic, phoneTilt, rubberBand, springs, unlockProgress, withVelocity } from "@/lib/motion";
import { openApp } from "@/lib/router";
import { prefersReducedMotion, useOS } from "@/lib/store";

import { IconFace } from "./AppIcon";
import { BrandTile } from "./BrandIcon";
import { instagram, substack } from "./brand-marks";
import { CameraGlyph, LockWidgets, NotificationStack, TorchGlyph, type LockNote, type NoteSwipe } from "./LockWidgets";
import { useServerData, type FeedPost } from "./server-data";

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = window.setTimeout(tick, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/** Clock face text, 12-hour like iOS; self-contained so the pre-hydration script below can run the same code. */
function clockText(d: Date) {
  return [
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    (d.getHours() % 12 || 12) + ":" + String(d.getMinutes()).padStart(2, "0"),
  ];
}

/**
 * Sizes the clock from the screen's own box: the iOS size (half the width, or 27.5% of the height
 * on wide screens), shrunk for wide times ("10:08") and fallback fonts until the digits fit inside
 * 5% side margins. Width is linear in font size, so one measure lands it. Self-contained, like
 * clockText, so the pre-hydration script runs the same code.
 */
function fitClock(lock: HTMLElement) {
  const digits = lock.querySelector<HTMLElement>(".lock-digits");
  const W = lock.clientWidth;
  const H = lock.clientHeight;
  if (!digits || !W || !H || !digits.textContent?.trim()) return;
  const base = Math.min(W * 0.5, H * 0.275);
  const size = parseFloat(getComputedStyle(digits).fontSize) || base;
  const em = digits.offsetWidth / size;
  const next = Math.min(base, em ? (W * 0.9) / em : base);
  if (Math.abs(next - size) > 0.25) lock.style.setProperty("--clock-fs", next.toFixed(2) + "px");
}

/**
 * Fills in the date and time straight after the server markup, before any JS loads, and fits the
 * clock: it is the largest thing on a first visit, so it paints with the page instead of after hydration.
 */
const FILL_CLOCK = `(function(){var t=(${clockText.toString()})(new Date()),e=document.currentScript.previousElementSibling,p=e.querySelectorAll("[data-fill]");p[0].textContent=t[0];p[1].textContent=t[1];p[1].setAttribute("data-text",t[1]);(${fitClock.toString()})(e.closest("[data-lock]"))})()`;

/**
 * Keeps the clock fitted: on any change to the screen's box (resize, rotation, the 3D phone taking
 * the screen) or the digits' (a new minute, Larger Text), and once the display font arrives.
 */
function useClockFit(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const lock = ref.current;
    if (!lock) return;
    const fit = () => fitClock(lock);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(lock.closest("[data-screen]") ?? lock);
    const digits = lock.querySelector(".lock-digits");
    if (digits) observer.observe(digits);
    document.fonts?.addEventListener("loadingdone", fit);
    void document.fonts?.ready.then(fit);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", fit);
    };
  }, [ref]);
}

/** Home icons fly in from slightly larger, 20 ms apart, on the gentle spring. */
export function flyInHome(screen: HTMLElement | null) {
  const items = screen?.querySelectorAll<HTMLElement>("[data-home-layer] [data-fly]");
  if (!items?.length) return;
  const reduce = prefersReducedMotion();
  items.forEach((el, i) => {
    el.style.opacity = "0";
    const settle = () => el.style.removeProperty(reduce ? "opacity" : "scale");
    if (reduce) {
      animateTo(0, 1, { duration: 0.2, onUpdate: (p) => (el.style.opacity = String(p)) }).then(settle);
      return;
    }
    animateTo(0, 1, {
      ...springs.gentle,
      delay: i * 0.02,
      onUpdate: (p) => {
        el.style.opacity = String(Math.min(1, p));
        // Chrome (dock, Search pill) only fades in; icons and widgets also settle from larger
        if (el.dataset.fly !== "fade") el.style.scale = String(1.25 - 0.25 * p);
      },
    }).then(() => {
      el.style.removeProperty("opacity");
      settle();
    });
  });
}

/**
 * The CSS phone has no 3D rig to tilt it: the pointer (desktop) or the device's own orientation
 * (where the browser shares it without asking) stands in, for the clock's parallax.
 */
function useStandInTilt() {
  useEffect(() => {
    const live3D = () => document.documentElement.hasAttribute("data-3d");
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onPointer = (e: PointerEvent) => {
      if (live3D() || e.pointerType !== "mouse") return;
      phoneTilt.x.set(clamp((e.clientX / innerWidth) * 2 - 1));
      phoneTilt.y.set(clamp((e.clientY / innerHeight) * 2 - 1));
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (live3D() || e.gamma === null || e.beta === null) return;
      phoneTilt.x.set(clamp(e.gamma / 25));
      phoneTilt.y.set(clamp((e.beta - 55) / 25));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("deviceorientation", onOrient, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, []);
}

const NOTE_TILE = "size-[2.375rem]";
const PROJECTS_ITEM = appsLayout.row.find((i) => i.id === "projects")!;
const PROJECT = projects.find((p) => p.id === lockProjectId);

/**
 * The three notifications, newest first: the latest Substack post, the latest reel and one
 * project. All are the site's own content, opening its own apps (or the reel, in a new tab).
 */
function lockNotes(post: FeedPost | undefined): LockNote[] {
  const notes: LockNote[] = [];
  if (post)
    notes.push({
      id: "substack",
      app: "Substack",
      tile: <BrandTile mark={substack} className={NOTE_TILE} />,
      title: post.title,
      body: post.subtitle || "New post",
      at: new Date(post.date),
      action: "post:0",
      hint: "Open in Blog",
    });
  if (latestReel)
    notes.push({
      id: "instagram",
      app: latestReel.app,
      tile: <BrandTile mark={instagram} className={NOTE_TILE} />,
      title: latestReel.title,
      body: latestReel.text,
      at: new Date(latestReel.posted),
      action: "reel",
      hint: `Opens the reel on ${latestReel.app} in a new tab`,
    });
  if (PROJECT)
    notes.push({
      id: "project",
      app: "Projects",
      tile: (
        <span aria-hidden className="block shrink-0" style={{ "--icon": "2.375rem" } as CSSProperties}>
          <IconFace item={PROJECTS_ITEM} tileKey={null} />
        </span>
      ),
      title: `${PROJECT.name}: ${PROJECT.tagline}`,
      body: PROJECT.description.split(/(?<=[.!?])\s/)[0],
      at: null,
      action: `project:${PROJECT.id}`,
      hint: "Open in Projects",
    });
  // Dated ones newest first; the project (no date) last
  return notes.sort((a, b) => (b.at?.getTime() ?? -Infinity) - (a.at?.getTime() ?? -Infinity));
}

/** Wheel / trackpad travel (px) that counts as a full swipe on the desktop. */
const WHEEL_IDLE_MS = 140;

/**
 * First visit of a session: date, a tall glass clock, three round widgets, a stack of
 * notifications (the latest post, reel and a project; swipe one left to clear it) and the
 * flashlight / camera buttons. Swipe up (it follows the finger and rubber-bands; the
 * wheel works too) to open; a tap wakes it (the sheet lifts to show the way), a second tap or
 * Enter opens. Deep links and repeat visits skip it.
 */
export function LockScreen() {
  const locked = useOS((s) => s.locked);
  const unlock = useOS((s) => s.unlock);
  const torch = useOS((s) => s.torch);
  const { posts } = useServerData();
  const now = useNow();
  const ref = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const [leaving, setLeaving] = useState(false);
  const [awake, setAwake] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const collapse = useMotionValue(1);
  const crossed = useRef(false);
  const downOn = useRef<Element | null>(null);
  const swipeNote = useRef<NoteSwipe | null>(null);
  const [cleared, setCleared] = useState<string[]>([]);
  const height = () => ref.current?.clientHeight ?? 800;
  useStandInTilt();
  useClockFit(ref);

  // 0 → 1 as the sheet travels up; the clock shrinks and fades ahead of it.
  const progress = useTransform(y, (v) => Math.min(1, Math.max(0, -v / height())));
  const clockScale = useTransform(progress, [0, 1], [1, 0.82]);
  const clockOpacity = useTransform(progress, [0, 0.45], [1, 0]);
  const hintOpacity = useTransform(progress, [0, 0.15], [1, 0]);
  // Widgets step aside while the notifications spread over them
  const widgetFade = useTransform([clockOpacity, collapse], ([o, c]: number[]) => o * c);

  // Parallax: the clock drifts a few px against the tilt and its sheen slides across the glass
  const tiltX = useSpring(phoneTilt.x, springs.gentle);
  const tiltY = useSpring(phoneTilt.y, springs.gentle);
  const still = () => prefersReducedMotion();
  const clockX = useTransform(tiltX, (v) => (still() ? 0 : v * -5));
  const clockY = useTransform(tiltY, (v) => (still() ? 0 : v * -4));
  const sheen = useTransform(tiltX, (v) => `${still() ? 55 : 55 - v * 25}% 0, 0 0`);

  useEffect(() => progress.on("change", (p) => unlockProgress.set(p)), [progress]);

  const commit = (velocity = 0, then?: () => void) => {
    if (leaving) return;
    setLeaving(true);
    const screen = ref.current?.closest<HTMLElement>("[data-screen]") ?? null;
    const done = () => {
      unlock();
      unlockProgress.set(1);
      then?.();
    };
    if (prefersReducedMotion()) {
      ref.current!.animate({ opacity: [1, 0] }, { duration: 200, fill: "forwards" }).finished.then(done);
      if (!then) flyInHome(screen);
      return;
    }
    animateTo(y, -height(), withVelocity("smooth", Math.min(velocity, -1200))).then(done);
    if (!then) window.setTimeout(() => flyInHome(screen), 60);
  };

  const setStack = (open: boolean) => {
    setExpanded(open);
    animateTo(collapse, open ? 0 : 1, prefersReducedMotion() ? { duration: 0.2 } : springs.smooth);
  };

  /** A tap on the glass: the first one wakes it (the sheet lifts a little and drops back, like iOS). */
  const wake = () => {
    if (awake) return commit();
    setAwake(true);
    if (prefersReducedMotion()) return;
    animateTo(y, -Math.min(56, height() * 0.07), springs.snappy).then(() => animateTo(y, 0, springs.release));
  };

  const notes = useMemo(() => lockNotes(posts[0]).filter((n) => !cleared.includes(n.id)), [posts, cleared]);
  const dismiss = (id: string) => {
    // Down to one: nothing left to spread
    if (notes.length <= 2) setStack(false);
    setCleared((c) => [...c, id]);
  };

  /** A notification's own action: the post in Blog, the reel in a new tab, the project in Projects. */
  const openNote = (action: string, el: HTMLElement) => {
    if (action.startsWith("post:")) {
      const post = posts[Number(action.slice(5))];
      if (!post) return;
      setLaunchOrigin("blog", el);
      const slug = post.url.replace(/\/+$/, "").split("/").pop() || post.url;
      return commit(0, () => openApp("blog", slug));
    }
    if (action === "reel") {
      haptic();
      if (latestReel) window.open(latestReel.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (action.startsWith("project:")) {
      setLaunchOrigin("projects", el);
      return commit(0, () => openApp("projects", action.slice(8)));
    }
  };

  const openCamera = (el: HTMLElement) => {
    setLaunchOrigin("contact", el);
    commit(0, () => openApp("contact"));
  };

  const tapOn = (target: Element | null) => {
    const el = target?.closest<HTMLElement>("[data-lock-action]");
    const action = el?.dataset.lockAction;
    if (!el || !action) return expanded ? setStack(false) : wake();
    if (action === "open") return commit();
    if (action === "torch") {
      haptic();
      return useOS.getState().setTorch(!useOS.getState().torch);
    }
    if (action === "camera") return openCamera(el);
    if (action === "stack") return setStack(true);
    return openNote(action, el);
  };

  useDrag(
    ({ tap, axis, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], last, first }) => {
      if (leaving) return;
      if (tap) return tapOn(downOn.current);
      // Sideways: a notification being swiped away (elsewhere, sideways means nothing)
      if (axis === "x") {
        const card = downOn.current?.closest<HTMLElement>("[data-lock-note]");
        if (card) swipeNote.current?.(Number(card.dataset.lockNote), { mx, vx: vx * dx * 1000, last });
        return;
      }
      const H = height();
      if (first) crossed.current = false;
      y.set(my < 0 ? my : rubberBand(my, 80));
      if (!crossed.current && -my > H * 0.3) {
        crossed.current = true;
        haptic();
      }
      if (last) {
        const v = vy * dy * 1000;
        if (-my > H * 0.3 || v < -600) commit(v);
        else animateTo(y, 0, withVelocity("snappy", v));
      }
    },
    { target: ref, axis: "lock", filterTaps: true, pointer: { capture: true } },
  );

  // Desktop: a scroll (wheel or two-finger swipe) moves the sheet the same way and settles when it stops
  useEffect(() => {
    const el = ref.current;
    if (!el || !locked) return;
    let travel = 0;
    let idle = 0;
    const onWheel = (e: WheelEvent) => {
      if (leaving) return;
      e.preventDefault();
      travel = Math.max(-60, travel + e.deltaY);
      y.set(travel > 0 ? -travel : rubberBand(-travel, 80));
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (travel > height() * 0.18) commit(-1200);
        else animateTo(y, 0, springs.snappy);
        travel = 0;
      }, WHEEL_IDLE_MS);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(idle);
    };
  });

  if (!locked) return null;

  const [date, time] = now ? clockText(now) : ["", ""];

  return (
    <m.div
      ref={ref}
      data-lock
      style={{ y }}
      onPointerDownCapture={(e) => (downOn.current = e.target as Element)}
      className="lock-screen absolute inset-0 z-56 flex touch-none flex-col items-center pt-[max(env(safe-area-inset-top),9.6cqh,56px)] text-white select-none"
    >
      <m.div style={{ scale: clockScale, opacity: clockOpacity }} className="flex flex-col items-center">
        <time suppressHydrationWarning dateTime={now?.toISOString()} className="flex flex-col items-center">
          <span data-fill suppressHydrationWarning className="lock-date">
            {date}
          </span>
          <m.span style={{ x: clockX, y: clockY }} className="lock-clock">
            <m.span data-fill data-text={time} suppressHydrationWarning style={{ backgroundPosition: sheen }} className="lock-digits">
              {time || " "}
            </m.span>
          </m.span>
        </time>
        <script dangerouslySetInnerHTML={{ __html: FILL_CLOCK }} />
        <LockWidgets now={now} fade={widgetFade} />
      </m.div>

      <m.div style={{ opacity: clockOpacity }}>
        <NotificationStack
          notes={notes}
          collapse={collapse}
          expanded={expanded}
          now={now}
          swipeRef={swipeNote}
          onDismiss={dismiss}
          onKeyExpand={() => setStack(true)}
          onKeyOpen={openNote}
        />
      </m.div>

      <button
        type="button"
        data-lock-action="torch"
        aria-label="Flashlight"
        aria-pressed={torch}
        onClick={(e) => e.detail === 0 && tapOn(e.currentTarget)}
        className="lock-button left-[calc(18.2cqw-var(--lb)/2)]"
      >
        <TorchGlyph on={torch} />
      </button>
      <m.button
        type="button"
        data-lock-action="open"
        style={{ opacity: hintOpacity }}
        onClick={(e) => e.detail === 0 && commit()}
        className="absolute bottom-[8.4cqh] left-1/2 flex -translate-x-1/2 translate-y-1/2 flex-col items-center gap-0.5 rounded-full px-4 py-1 text-[0.875rem] font-semibold whitespace-nowrap text-white/90 [text-shadow:0_1px_8px_rgb(0_0_0/0.3)]"
      >
        <svg aria-hidden viewBox="0 0 24 24" className={awake ? "lock-chevron size-5" : "size-5"} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 15 6-6 6 6" />
        </svg>
        Swipe up to open
      </m.button>
      <button
        type="button"
        data-lock-action="camera"
        aria-label={`Camera: contact ${profile.firstName}`}
        onClick={(e) => e.detail === 0 && tapOn(e.currentTarget)}
        className="lock-button right-[calc(18.2cqw-var(--lb)/2)]"
      >
        <CameraGlyph />
      </button>
      <span aria-hidden className="absolute bottom-[max(env(safe-area-inset-bottom),8px)] left-1/2 h-[5px] w-[36%] max-w-[140px] -translate-x-1/2 rounded-full bg-white" />
    </m.div>
  );
}
