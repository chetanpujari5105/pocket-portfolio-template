"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useDrag } from "@use-gesture/react";

import { profile } from "@content/profile";
import { animateTo, haptic, rubberBand, springs, unlockProgress, withVelocity } from "@/lib/motion";
import { prefersReducedMotion, useOS } from "@/lib/store";

import { Glyph } from "./icons";
import { useServerData } from "./server-data";

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

/** Clock face text; self-contained so the pre-hydration script below can run the same code. */
function clockText(d: Date) {
  return [
    d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"),
  ];
}

/**
 * Fills in the date and time straight after the server markup, before any JS loads: the clock is
 * the largest thing on a first visit, so it paints with the page instead of after hydration.
 */
const FILL_CLOCK = `(function(){var t=(${clockText.toString()})(new Date()),p=document.currentScript.previousElementSibling.children;p[0].textContent=t[0];p[1].textContent=t[1]})()`;

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
 * First visit of a session: clock, date and a notification. Swipe up (it follows the finger and
 * rubber-bands), or tap / press Enter, to open. Deep links and repeat visits skip it.
 */
export function LockScreen() {
  const locked = useOS((s) => s.locked);
  const unlock = useOS((s) => s.unlock);
  const { posts } = useServerData();
  const now = useNow();
  const ref = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const [leaving, setLeaving] = useState(false);
  const crossed = useRef(false);
  const height = () => ref.current?.clientHeight ?? 800;

  // 0 → 1 as the sheet travels up; the clock shrinks and fades ahead of it.
  const progress = useTransform(y, (v) => Math.min(1, Math.max(0, -v / height())));
  const clockScale = useTransform(progress, [0, 1], [1, 0.82]);
  const clockOpacity = useTransform(progress, [0, 0.45], [1, 0]);
  const hintOpacity = useTransform(progress, [0, 0.15], [1, 0]);

  useEffect(() => progress.on("change", (p) => unlockProgress.set(p)), [progress]);

  const commit = (velocity = 0) => {
    if (leaving) return;
    setLeaving(true);
    const screen = ref.current?.closest<HTMLElement>("[data-screen]") ?? null;
    const done = () => {
      unlock();
      unlockProgress.set(1);
    };
    if (prefersReducedMotion()) {
      ref.current!.animate({ opacity: [1, 0] }, { duration: 200, fill: "forwards" }).finished.then(done);
      flyInHome(screen);
      return;
    }
    animateTo(y, -height(), withVelocity("smooth", Math.min(velocity, -1200))).then(done);
    window.setTimeout(() => flyInHome(screen), 60);
  };

  useDrag(
    ({ tap, movement: [, my], velocity: [, vy], direction: [, dy], last, first }) => {
      if (leaving) return;
      if (tap) return commit();
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
    { target: ref, axis: "y", filterTaps: true, pointer: { capture: true } },
  );

  if (!locked) return null;

  const [date, time] = now ? clockText(now) : ["", ""];
  const latest = posts[0];

  return (
    <m.div
      ref={ref}
      data-lock
      style={{ y }}
      className="absolute inset-0 z-56 flex touch-none flex-col items-center px-[6cqw] pt-[max(env(safe-area-inset-top),11cqh)] pb-[max(env(safe-area-inset-bottom),3cqh)] text-white select-none [background:linear-gradient(180deg,rgb(0_0_0/0.28),rgb(0_0_0/0.05)_40%,rgb(0_0_0/0.35))]"
    >
      <m.div style={{ scale: clockScale, opacity: clockOpacity }} className="flex flex-col items-center">
        <p suppressHydrationWarning className="text-[17px] font-semibold tracking-wide text-white/85">
          {date}
        </p>
        <p
          suppressHydrationWarning
          className="mt-0.5 font-display text-[min(96px,26cqw)] leading-none font-extrabold tabular-nums [font-stretch:110%] [text-shadow:0_2px_24px_rgb(0_0_0/0.25)]"
        >
          {time || " "}
        </p>
      </m.div>
      <script dangerouslySetInnerHTML={{ __html: FILL_CLOCK }} />

      {latest && (
        <m.div style={{ opacity: clockOpacity }} className="glass-dark mt-[5cqh] flex w-full items-center gap-3 rounded-[22px] p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]">
          <span
            aria-hidden
            className="grid size-[38px] shrink-0 place-items-center rounded-[10px] text-white"
            style={{ background: "linear-gradient(165deg, #ffb36b, #ff6a1f)" }}
          >
            <Glyph name="newspaper" className="size-[20px]" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="flex items-baseline justify-between gap-2 text-[12px] font-semibold text-white/75">
              <span>Substack</span>
              <span className="font-medium">now</span>
            </span>
            <span className="block truncate text-[14px] font-semibold">New on Substack: {latest.title}</span>
            <span className="block truncate text-[12.5px] text-white/75">{profile.name}</span>
          </span>
        </m.div>
      )}

      <m.button
        type="button"
        style={{ opacity: hintOpacity }}
        onClick={(e) => e.detail === 0 && commit()}
        className="mt-auto flex flex-col items-center gap-1 rounded-full px-4 py-2 text-[14px] font-semibold text-white/90"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="lock-chevron size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 15 6-6 6 6" />
        </svg>
        Swipe up to open
      </m.button>
      <span aria-hidden className="mt-2 h-[5px] w-[36%] max-w-[140px] rounded-full bg-white/85" />
    </m.div>
  );
}
