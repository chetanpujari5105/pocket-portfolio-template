"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { animate, useMotionValue, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useDrag } from "@use-gesture/react";

import { releaseVelocity } from "@/lib/gesture";
import { setLaunchOrigin } from "@/lib/launch";
import { fadeTransition, rubberBand, springs, withVelocity } from "@/lib/motion";
import { openApp } from "@/lib/router";
import { prefersReducedMotion, readSession, useOS, writeSession } from "@/lib/store";

import { Glyph } from "./icons";
import { useServerData } from "./server-data";

/** Session flag: the banner shows at most once per browser session. */
export const BANNER_KEY = "pp-banner";
const DELAY_MS = 8000;
const SHOW_MS = 7000;

const slugOf = (url: string) => url.replace(/\/+$/, "").split("/").pop() || url;

/**
 * 8 s after unlock, if Blog hasn't been opened, the newest post drops in as a notification. Tap
 * opens it in Blog (launching from the banner); swipe it up, press Esc, or wait to dismiss.
 */
export function NotificationBanner({ screenRef }: { screenRef: RefObject<HTMLDivElement | null> }) {
  const locked = useOS((s) => s.locked);
  const { posts } = useServerData();
  const post = posts[0];
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const y = useMotionValue(-160);
  const fade = useMotionValue(1);
  const scale = useTransform(y, [-160, 0], [0.92, 1]);
  const hideTimer = useRef(0);
  const held = useRef(false);

  useEffect(() => {
    if (locked || !post || readSession(BANNER_KEY)) return;
    let timer = window.setTimeout(function tryShow() {
      const s = useOS.getState();
      if (s.recents.includes("blog") || s.route.app === "blog") return writeSession(BANNER_KEY, "1");
      // Wait for a calm moment: nothing else on top of the screen
      if (s.spotlightOpen || s.switcherOpen || s.panelOpen || s.wiggle) {
        timer = window.setTimeout(tryShow, 3000);
        return;
      }
      writeSession(BANNER_KEY, "1");
      setShown(true);
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [locked, post]);

  const dismiss = (velocity = 0) => {
    window.clearTimeout(hideTimer.current);
    const done = () => setShown(false);
    if (prefersReducedMotion()) animate(fade, 0, fadeTransition).then(done);
    else animate(y, -(ref.current?.offsetHeight ?? 90) - 40, withVelocity("smooth", Math.min(velocity, -400))).then(done);
  };
  const scheduleHide = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => !held.current && dismiss(), SHOW_MS);
  };

  useEffect(() => {
    if (!shown) return;
    if (prefersReducedMotion()) {
      y.set(0);
      fade.set(0);
      animate(fade, 1, fadeTransition);
    } else {
      fade.set(1);
      animate(y, 0, springs.smooth);
    }
    scheduleHide();
    return () => window.clearTimeout(hideTimer.current);
    // scheduleHide only reads refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, y, fade]);

  const openPost = () => {
    if (!post) return;
    if (ref.current) setLaunchOrigin("blog", ref.current);
    openApp("blog", slugOf(post.url));
    window.clearTimeout(hideTimer.current);
    animate(fade, 0, { duration: 0.15 }).then(() => setShown(false));
  };

  useDrag(
    (s) => {
      if (s.tap) return openPost();
      const my = s.movement[1];
      // Up follows the finger; down only stretches a little
      y.set(my < 0 ? my : rubberBand(my, 60));
      held.current = !s.last;
      if (s.last) {
        const v = releaseVelocity(s, 1);
        if (my < -30 || v < -300) dismiss(v);
        else {
          animate(y, 0, withVelocity("snappy", v));
          scheduleHide();
        }
      }
    },
    { target: ref, axis: "y", filterTaps: true, threshold: 4, pointer: { capture: true } },
  );

  if (!shown || !post) return null;
  return (
    <m.button
      ref={ref}
      type="button"
      data-banner
      aria-label={`New post on Substack: ${post.title}. Open in Blog`}
      style={{ y, scale, opacity: fade }}
      onClick={(e) => e.detail === 0 && openPost()}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        dismiss();
        screenRef.current?.focus({ preventScroll: true });
      }}
      onPointerEnter={() => (held.current = true)}
      onPointerLeave={() => {
        held.current = false;
        scheduleHide();
      }}
      onFocus={() => (held.current = true)}
      onBlur={() => (held.current = false)}
      className="glass-dark absolute inset-x-[2.5cqw] top-[max(env(safe-area-inset-top),8px)] z-[77] flex touch-none items-center gap-3 rounded-[22px] p-3 text-left text-white shadow-[0_10px_30px_rgb(0_0_0/0.25),inset_0_1px_0_rgb(255_255_255/0.2)] tab:top-[5.4cqh]"
    >
      <span
        aria-hidden
        className="grid size-[38px] shrink-0 place-items-center rounded-[10px]"
        style={{ background: "linear-gradient(165deg, #ffb36b, #ff6a1f)" }}
      >
        <Glyph name="newspaper" className="size-[20px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2 text-[12px] font-semibold text-white/75">
          <span>Substack</span>
          <span className="font-medium">now</span>
        </span>
        <span className="block truncate text-[14px] font-semibold">New post: {post.title}</span>
        <span className="block truncate text-[12.5px] text-white/75">{post.subtitle}</span>
      </span>
    </m.button>
  );
}
