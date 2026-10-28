"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  animate,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import * as m from "motion/react-m";
import { useDrag } from "@use-gesture/react";

import { appsLayout, askApp } from "@content/apps";
import type { AppId } from "@content/schema";
import { originRect, type Rect } from "@/lib/launch";
import { dismissProgress, haptic, launchProgress, rubberBand, springs, withVelocity } from "@/lib/motion";
import { goHome } from "@/lib/router";
import { prefersReducedMotion, useOS } from "@/lib/store";

import { Glyph } from "./icons";
import { WindowCtx, type WindowMotion } from "./window-motion";

const ITEMS = [...appsLayout.block, ...appsLayout.row, ...appsLayout.dock, askApp];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const mix = (a: number, b: number, p: number) => a + (b - a) * p;

type Geometry = Rect & { W: number; H: number; screenR: number };


type Props = {
  app: AppId;
  title: string;
  closing: boolean;
  initial: boolean;
  /** Close fast (switching apps: out to home, then into the next app) */
  quick: boolean;
  screenRef: RefObject<HTMLDivElement | null>;
  onClosed: () => void;
  children: ReactNode;
};

/** Hold still this long mid-swipe to open the app switcher. */
const HOLD_MS = 300;

export function AppWindow({ app, title, closing, initial, quick, screenRef, onClosed, children }: Props) {
  const geo = useRef<Geometry | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const controls = useRef<AnimationPlaybackControls[]>([]);
  const fade = useMotionValue(1);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const push = useMotionValue(0);
  const sheet = useMotionValue(0);
  const reduced = useRef(false);
  const release = useRef({ vx: 0, vy: 0 });
  const item = ITEMS.find((i) => i.app === app);

  const stop = () => {
    controls.current.forEach((c) => c.stop());
    controls.current = [];
  };

  const measure = (consume: boolean) => {
    const screen = screenRef.current;
    if (!screen) return;
    const W = screen.clientWidth;
    const H = screen.clientHeight;
    const screenR = parseFloat(getComputedStyle(screen).borderTopLeftRadius) || 0;
    geo.current = { ...originRect(screen, app, consume), W, H, screenR };
  };

  /*
   * p = 0: the window is the origin rect (icon); p = 1: full screen. The window is scaled to
   * the rect's width and clipped top/bottom to its height, so a square icon and a tall card
   * both work. Radius is in unscaled px; the swipe-down-to-card state rounds it further.
   */
  const frame = (p: number, d: number) => {
    const g = geo.current;
    if (!g) return { transform: "none", clipPath: "none" };
    const s0 = g.w / g.W;
    const clipY0 = Math.max(0, (g.H - g.h / s0) / 2);
    const q = Math.max(0, 1 - p);
    const scale = mix(s0, 1, p);
    const tx = g.x * q;
    const ty = (g.y - clipY0 * s0) * q;
    const clipY = clipY0 * Math.min(1, q);
    const radius = Math.max(0, mix(g.r / s0, g.screenR, Math.min(p, 1))) + d * 28;
    return {
      transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
      clipPath: `inset(${clipY}px 0px ${clipY}px 0px round ${radius}px)`,
    };
  };

  const transform = useTransform([launchProgress, dismissProgress], ([p, d]: number[]) => frame(p, d).transform);
  const clipPath = useTransform([launchProgress, dismissProgress], ([p, d]: number[]) => frame(p, d).clipPath);
  // Icon art crossfades into the app during the first 40% of the launch; content sharpens.
  const contentOpacity = useTransform(launchProgress, [0.05, 0.4], [0, 1]);
  const overlayOpacity = useTransform(launchProgress, [0, 0.4], [1, 0]);
  const contentFilter = useTransform(launchProgress, (p) => (p >= 0.4 ? "none" : `blur(${(1 - p / 0.4) * 6}px)`));
  // Swipe-up dismiss: the card follows the finger, shrinking toward 0.6 from its bottom edge.
  const dragTransform = useTransform([dragX, dragY, dismissProgress], ([x, y, d]: number[]) =>
    x === 0 && y === 0 && d === 0 ? "none" : `translate3d(${x}px, ${y}px, 0) scale(${1 - 0.4 * d})`,
  );

  // Measure before paint so the first frame already sits on the icon.
  useLayoutEffect(() => {
    measure(true);
    reduced.current = prefersReducedMotion();
    dismissProgress.set(0);
    if (initial) {
      launchProgress.set(1);
    } else if (reduced.current) {
      launchProgress.set(1);
      fade.set(0);
      controls.current = [animate(fade, 1, { duration: 0.2, ease: "easeOut" })];
    } else {
      launchProgress.set(0);
      controls.current = [animate(launchProgress, 1, springs.launch)];
    }
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  // Close (or re-open if the close is interrupted), handing over any swipe velocity.
  useEffect(() => {
    stop();
    if (closing) {
      measure(false);
      if (useOS.getState().switcherOpen) {
        // The app switcher takes over from the dragged card.
        launchProgress.set(0);
        dismissProgress.set(0);
        onClosed();
        return;
      }
      if (reduced.current) {
        controls.current = [animate(fade, 0, { duration: 0.15, ease: "easeOut", onComplete: onClosed })];
        return;
      }
      const H = geo.current?.H ?? 800;
      const { vx, vy } = release.current;
      release.current = { vx: 0, vy: 0 };
      const spring = quick ? springs.snappy : springs.home;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        launchProgress.set(0);
        dismissProgress.set(0);
        dragX.set(0);
        dragY.set(0);
        onClosed();
      };
      // Upward finger speed becomes shrink speed (progress per second)
      controls.current = [
        animate(launchProgress, 0, {
          ...spring,
          velocity: (Math.min(0, vy) / H) * 1.4,
          onUpdate: (p) => p < 0.015 && finish(),
          onComplete: finish,
        }),
        animate(dismissProgress, 0, spring),
        animate(dragX, 0, { ...spring, velocity: vx }),
        animate(dragY, 0, { ...spring, velocity: vy }),
      ];
    } else if (launchProgress.get() < 1 && !reduced.current) {
      controls.current = [
        animate(launchProgress, 1, springs.launch),
        animate(dismissProgress, 0, springs.smooth),
        animate(dragX, 0, springs.smooth),
        animate(dragY, 0, springs.smooth),
      ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  // Keep geometry right if the viewport changes while the app is open.
  useEffect(() => {
    const onResize = () => {
      measure(false);
      launchProgress.set(launchProgress.get() + 1e-6);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  // Initial focus goes into the window; the focus trap keeps it there.
  useEffect(() => {
    const first = windowRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? windowRef.current)?.focus({ preventScroll: true });
  }, [app]);

  const trapFocus = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !windowRef.current) return;
    const nodes = [...windowRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (n) => n.offsetParent !== null,
    );
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Home indicator: swipe up to go home, swipe up and hold (or double-tap) for the app switcher.
  const handleRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef(0);
  const lastTap = useRef(0);
  const openSwitcher = () => {
    window.clearTimeout(holdTimer.current);
    haptic();
    useOS.getState().setSwitcherOpen(true);
    goHome();
  };
  useDrag(
    (s) => {
      const { first, last, tap, movement, velocity, direction, cancel, timeStamp } = s;
      if (closing || useOS.getState().switcherOpen) {
        cancel();
        return;
      }
      if (tap) {
        if (timeStamp - lastTap.current < 320) openSwitcher();
        lastTap.current = timeStamp;
        return;
      }
      const H = geo.current?.H ?? 800;
      if (first) stop();
      const up = Math.max(0, -movement[1]);
      const reduce = reduced.current;
      // Follow the finger (without the shrink under reduced motion); a downward pull rubber-bands.
      dragX.set(reduce ? 0 : movement[0] * 0.9);
      dragY.set(movement[1] > 0 ? rubberBand(movement[1], 60) : movement[1]);
      dismissProgress.set(reduce ? 0 : Math.min(1, up / (H * 0.6)));

      // Finger up the screen and holding still → app switcher. Every move re-arms the timer,
      // so it only fires once the finger stops for HOLD_MS.
      window.clearTimeout(holdTimer.current);
      if (!last && up > 50) {
        holdTimer.current = window.setTimeout(openSwitcher, HOLD_MS);
      }

      if (last) {
        window.clearTimeout(holdTimer.current);
        const vy = velocity[1] * direction[1] * 1000;
        const vx = velocity[0] * direction[0] * 1000;
        if (vy < -500 || (up > H * 0.25 && vy < 300)) {
          release.current = { vx, vy };
          goHome();
        } else {
          controls.current = [
            animate(dragX, 0, withVelocity("smooth", vx)),
            animate(dragY, 0, withVelocity("smooth", vy)),
            animate(dismissProgress, 0, springs.smooth),
          ];
        }
      }
    },
    { target: handleRef, filterTaps: true, threshold: 4, pointer: { capture: true } },
  );
  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  const style = { transformOrigin: "0 0", transform, clipPath, opacity: fade } as unknown as CSSProperties;
  const motionCtx = useMemo<WindowMotion>(() => ({ push, sheet, width: () => geo.current?.W ?? 400 }), [push, sheet]);

  return (
    <m.div
      style={{ transform: dragTransform, transformOrigin: "50% 100%" } as unknown as CSSProperties}
      className="pointer-events-none absolute inset-0 z-40"
      data-app-window={app}
    >
      <m.div
        ref={windowRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={trapFocus}
        style={style}
        className="pointer-events-auto absolute inset-0 overflow-hidden bg-app-background text-app-ink outline-none will-change-transform"
      >
        <m.div style={{ opacity: contentOpacity, filter: contentFilter }} className="absolute inset-0">
          <WindowCtx.Provider value={motionCtx}>{children}</WindowCtx.Provider>
        </m.div>

        {/* The icon's face, fading out as the window grows */}
        {item && (
          <m.div
            aria-hidden
            style={{
              opacity: overlayOpacity,
              background: `linear-gradient(165deg, ${item.colors[0]}, ${item.colors[1]})`,
            }}
            className="pointer-events-none absolute inset-0 grid place-items-center text-white"
          >
            <Glyph name={item.icon} className="w-[54cqmin]" />
          </m.div>
        )}

        <div
          ref={handleRef}
          data-home-indicator
          className="absolute inset-x-0 bottom-0 z-50 flex h-[34px] cursor-grab touch-none items-end justify-center pb-[max(env(safe-area-inset-bottom),8px)] active:cursor-grabbing"
          aria-hidden
        >
          <span className="h-[5px] w-[36%] max-w-[140px] rounded-full bg-app-ink/85" />
        </div>
      </m.div>
    </m.div>
  );
}
