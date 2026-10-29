"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useMotionValue } from "motion/react";
import { useDrag } from "@use-gesture/react";

import { expertise } from "@content/expertise";
import { ExpertiseTile } from "@/components/apps/expertise-tile";
import { releaseVelocity } from "@/lib/gesture";
import { setLaunchOrigin } from "@/lib/launch";
import { animateTo, fadeTransition, FLICK_VELOCITY, homePagerX, project, rubberClamp, withVelocity } from "@/lib/motion";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";

/*
 * The Expertise widget as a Smart Stack: one area at a time, the next two peeking above it.
 * `pos` is the stack's position in cards (2.4 = card 3 on its way to card 4); every card is drawn
 * from it by writing its transform and opacity directly, so a drag, a spring, a wheel step or
 * autoplay all move the same value and any of them can take over from another mid-flight.
 *
 * Swipe up / wheel down / ↓ = next. A vertical drag here belongs to the stack: the pager ignores
 * it (`data-no-pull`), and the 3D phone never turns from inside the screen. Sideways still pages.
 */

const N = expertise.length;
const LAST = N - 1;
/** Two blank cards after the last one, so card 8 still has a stack peeking behind it. */
const CARDS = N + 2;
/** The front card fills the tile below this line; the cards behind peek out above it. */
const FRONT_TOP = 0.12;
const CARD_H = 1 - FRONT_TOP;
/** Resting places behind the front card: lift (fraction of the tile), width (scale), opacity. */
const SLOTS = [
  { lift: 0, scale: 1, opacity: 1 },
  { lift: 0.06, scale: 0.86, opacity: 0.72 },
  { lift: 0.12, scale: 0.72, opacity: 0.44 },
  { lift: 0.12, scale: 0.62, opacity: 0 },
];
/** Flicks project like the pager's, and land at most one card past where the finger let go. */
const DECELERATION = 0.99;
const AUTOPLAY_MS = 6000;
const WHEEL_STEP = 24;
const WHEEL_QUIET_MS = 180;

type Look = { transform: string; opacity: number; z: number; content: number };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** translateY in % of the card's own height, from a fraction of the tile's. */
const lift = (tile: number) => `${((-tile / CARD_H) * 100).toFixed(3)}%`;

function slotLook(depth: number): Look {
  const k = Math.min(Math.floor(depth), SLOTS.length - 1);
  const a = SLOTS[k];
  const b = SLOTS[Math.min(k + 1, SLOTS.length - 1)];
  const t = clamp(depth - k, 0, 1);
  return {
    transform: `translate3d(0, ${lift(lerp(a.lift, b.lift, t))}, 0) scale(${lerp(a.scale, b.scale, t).toFixed(4)})`,
    opacity: lerp(a.opacity, b.opacity, t),
    z: 100 - Math.round(depth * 10),
    // Only the front card shows its words; they fade in over the last stretch of arriving
    content: clamp(1 - depth * 1.6, 0, 1),
  };
}

/** How card `i` looks with the stack at `p` (already clamped to the real cards). */
function cardLook(i: number, p: number, reduced: boolean): Look {
  if (reduced) {
    // No stack motion: the slots jump, the front card crossfades into the next one
    const lo = Math.floor(p);
    const hi = Math.ceil(p);
    if (i < lo) return { transform: "none", opacity: 0, z: 0, content: 0 };
    if (i === lo) return { transform: "none", opacity: 1 - (p - lo), z: 110, content: 1 };
    if (i === hi) return { transform: "none", opacity: 1, z: 100, content: 1 };
    return slotLook(i - hi);
  }
  const d = i - p;
  if (d >= 0) return slotLook(d);
  // Going up and out (or coming back down): the full height of the tile, 1:1 with the finger
  const t = Math.max(-1, d);
  return {
    transform: `translate3d(0, ${((t / CARD_H) * 100).toFixed(3)}%, 0)`,
    opacity: clamp((1 + t) * 2, 0, 1),
    z: 110,
    content: 1,
  };
}

const style = (look: Look): CSSProperties => ({ transform: look.transform, opacity: look.opacity, zIndex: look.z });

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
function useReduced() {
  const setting = useOS((s) => s.reduceMotion);
  const media = useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE_QUERY).matches, () => false);
  return setting || media;
}

/** 2×2: the expertise areas as a swipeable stack. Opens Expertise at the card on top. */
export function ExpertiseStack() {
  const pos = useMotionValue(0);
  const reduced = useReduced();
  const wiggle = useOS((s) => s.wiggle);
  const [front, setFront] = useState({ index: 0, dir: 0 });
  const [said, setSaid] = useState("");

  const buttonRef = useRef<HTMLButtonElement>(null);
  const tileRef = useRef<HTMLSpanElement>(null);
  const stackRef = useRef<HTMLSpanElement>(null);
  const cardRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const contentRefs = useRef<(HTMLSpanElement | null)[]>([]);
  /** Where the stack is headed (a run of wheel steps or key presses adds up from here). */
  const target = useRef(0);
  const reducedRef = useRef(reduced);
  const dragged = useRef(false);
  /** Autoplay stops for good at the first touch, wheel or key. */
  const touched = useRef(false);
  const paused = useRef({ hover: false, focus: false });
  const [initial] = useState(() => Array.from({ length: CARDS }, (_, i) => style(cardLook(i, 0, false))));

  // Draw every card from `pos`
  useLayoutEffect(() => {
    reducedRef.current = reduced;
    const draw = (p: number) => {
      const c = clamp(p, 0, LAST);
      const rm = reducedRef.current;
      // Past either end the whole stack rubber-bands with the finger
      const stack = stackRef.current;
      if (stack) stack.style.transform = c === p || rm ? "" : `translate3d(0, ${(-(p - c) * 100).toFixed(3)}%, 0)`;
      for (let i = 0; i < CARDS; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        const look = cardLook(i, c, rm);
        card.style.transform = look.transform;
        card.style.opacity = String(look.opacity);
        card.style.zIndex = String(look.z);
        const content = contentRefs.current[i];
        if (content) content.style.opacity = String(look.content);
      }
      const index = Math.round(c);
      setFront((f) => (f.index === index ? f : { index, dir: Math.sign(index - f.index) }));
    };
    draw(pos.get());
    return pos.on("change", draw);
  }, [pos, reduced]);

  const announce = (i: number) => setSaid(`${i + 1} of ${N}: ${expertise[i].title}`);

  /** Moves the stack to card `to` on the shared spring (or a crossfade), from wherever it is now. */
  const goTo = (to: number, velocity = pos.getVelocity()) => {
    const next = clamp(to, 0, LAST);
    target.current = next;
    animateTo(pos, next, reducedRef.current ? fadeTransition : withVelocity("smooth", velocity));
    return next;
  };
  const step = (delta: number, user = true) => {
    const from = clamp(Math.round(target.current), 0, LAST);
    if (from + delta < 0 || from + delta > LAST) return false;
    const next = goTo(from + delta);
    if (user) announce(next);
    return true;
  };
  const interact = () => {
    touched.current = true;
  };

  /* ───── Drag: vertical only; sideways is cancelled here and pages the home screen ───── */
  useDrag(
    (s) => {
      const { first, last, tap, axis, movement, cancel } = s;
      if (tap) return;
      let memo = s.memo as { base: number; step: number } | undefined;
      if (first) {
        if (axis !== "y" || useOS.getState().wiggle) {
          cancel();
          return;
        }
        interact();
        dragged.current = true;
        buttonRef.current?.setAttribute("data-stack-drag", "");
        pos.stop();
        // Screen px per card: the tile's on-screen height, so the card stays under the finger
        // whatever the 3D phone's scale
        memo = { base: pos.get(), step: tileRef.current?.getBoundingClientRect().height || 120 };
      }
      if (!memo) return;
      const vy = releaseVelocity(s, 1);
      if (reducedRef.current) {
        // No stack motion: a deliberate swipe crossfades one card
        if (last) {
          buttonRef.current?.removeAttribute("data-stack-drag");
          if (Math.abs(movement[1]) > memo.step * 0.2 || Math.abs(vy) > 400) step(movement[1] < 0 ? 1 : -1);
        }
        return memo;
      }
      const px = rubberClamp(memo.base * memo.step - movement[1], 0, LAST * memo.step, memo.step * 0.5);
      pos.set(px / memo.step);
      if (last) {
        buttonRef.current?.removeAttribute("data-stack-drag");
        const p = pos.get();
        const nearest = Math.round(clamp(p, 0, LAST));
        let projected = Math.round(p - project(vy, DECELERATION) / memo.step);
        // A flick always carries on to the next card its way, however short it was
        if (vy < -FLICK_VELOCITY * 1000) projected = Math.max(projected, Math.ceil(p));
        if (vy > FLICK_VELOCITY * 1000) projected = Math.min(projected, Math.floor(p));
        const next = goTo(clamp(projected, nearest - 1, nearest + 1), -vy / memo.step);
        announce(next);
      }
      return memo;
    },
    // Arrow keys are handled below (use-gesture would turn them into a drag of their own)
    { target: buttonRef, axis: "lock", threshold: 10, filterTaps: true, pointer: { capture: true, keys: false }, enabled: !wiggle },
  );

  /* ───── Wheel / trackpad: one card per gesture; sideways scrolls page the home screen ───── */
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const w = { sum: 0, fired: false, timer: 0 };
    const onWheel = (e: WheelEvent) => {
      if (useOS.getState().wiggle || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      // Ours: not the page's scroll, not Search's pull
      e.preventDefault();
      e.stopPropagation();
      interact();
      window.clearTimeout(w.timer);
      // A gesture ends when the wheel goes quiet (trackpad momentum keeps it "the same" gesture)
      w.timer = window.setTimeout(() => {
        w.sum = 0;
        w.fired = false;
      }, WHEEL_QUIET_MS);
      if (w.fired) return;
      w.sum += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      if (Math.abs(w.sum) < WHEEL_STEP) return;
      w.fired = true;
      step(w.sum > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(w.timer);
    };
    // `step` only reads refs and the stable motion value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───── Autoplay: every ~6 s on screen, untouched, unhovered, unfocused; never under reduced motion ───── */
  useEffect(() => {
    if (reduced) return;
    let shown = 0;
    const TICK = 500;
    const id = window.setInterval(() => {
      const el = buttonRef.current;
      const s = useOS.getState();
      const page = el?.closest<HTMLElement>("[data-home-page]");
      const r = el?.getBoundingClientRect();
      const visible =
        !!el &&
        !!r &&
        !document.hidden &&
        !paused.current.hover &&
        !paused.current.focus &&
        !s.wiggle &&
        !s.locked &&
        !s.route.app &&
        !s.spotlightOpen &&
        !s.panelOpen &&
        !s.switcherOpen &&
        Number(page?.dataset.homePage) === s.homePage &&
        !homePagerX.isAnimating() &&
        r.width > 0 &&
        r.bottom > 0 &&
        r.top < window.innerHeight;
      shown = visible ? shown + TICK : 0;
      if (touched.current || target.current >= LAST) return window.clearInterval(id);
      if (shown < AUTOPLAY_MS) return;
      shown = 0;
      step(1, false);
    }, TICK);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const area = expertise[front.index];
  return (
    <button
      ref={buttonRef}
      type="button"
      data-nav
      data-app-icon="expertise"
      data-no-pull
      data-expertise-stack
      aria-label={`Expertise, ${front.index + 1} of ${N}: ${area.title}`}
      onPointerDown={(e) => {
        dragged.current = false;
        if (e.button === 0) interact();
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && (paused.current.hover = true)}
      onPointerLeave={() => (paused.current.hover = false)}
      onFocus={() => (paused.current.focus = true)}
      onBlur={() => (paused.current.focus = false)}
      onKeyDown={(e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || useOS.getState().wiggle) return;
        interact();
        // At either end the arrow carries on to the home screen's own arrow-key navigation
        if (step(e.key === "ArrowDown" ? 1 : -1)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onClick={(e) => {
        // The click a drag ends with is the drag's, not a tap
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        const shown = expertise[clamp(Math.round(pos.get()), 0, LAST)];
        setLaunchOrigin("expertise", e.currentTarget.querySelector<HTMLElement>("[data-widget-tile]") ?? e.currentTarget);
        openApp("expertise", shown.id);
      }}
      className="icon-press flex size-full touch-none flex-col items-center gap-[calc(var(--icon)*0.11)] select-none"
    >
      <span
        ref={tileRef}
        data-widget-tile
        className="widget-press [container-type:size] relative min-h-0 w-full flex-1 overflow-hidden text-left"
      >
        <span ref={stackRef} aria-hidden className="absolute inset-0">
          {Array.from({ length: CARDS }, (_, i) => {
            const card = expertise[i];
            return (
              <span
                key={card?.id ?? `blank-${i}`}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                data-stack-card={card ? i : undefined}
                className="absolute inset-x-0 bottom-0 origin-top widget-r widget-light"
                style={{ top: `${FRONT_TOP * 100}%`, ...initial[i] }}
              >
                {card && (
                  <span
                    ref={(el) => {
                      contentRefs.current[i] = el;
                    }}
                    className="flex size-full flex-col justify-between p-[9cqmin]"
                    style={{ opacity: cardLook(i, 0, false).content }}
                  >
                    <ExpertiseTile id={card.id} size="clamp(22px,20cqmin,34px)" />
                    <span className="flex min-w-0 flex-col">
                      <span className="line-clamp-2 text-[clamp(12px,9.2cqmin,15px)] leading-tight font-bold tracking-tight">{card.title}</span>
                      <span className="mt-[2cqmin] truncate text-[clamp(9.5px,6.8cqmin,12px)] font-medium text-app-muted">
                        +{N - 1} more areas
                      </span>
                    </span>
                  </span>
                )}
              </span>
            );
          })}
          {/* The counter rides on the front card's corner; its number rolls the way the stack moved */}
          <span
            className="absolute right-[9cqmin] z-[200] flex overflow-hidden rounded-full bg-app-background px-[4cqmin] py-[1.5cqmin] text-[clamp(9px,6.4cqmin,11px)] leading-[1.25] font-semibold text-app-muted tabular-nums"
            style={{ top: `calc(${FRONT_TOP * 100}% + 9cqmin)` }}
          >
            <span key={front.index} data-stack-count data-dir={front.dir} className="stack-count">
              {front.index + 1}
            </span>
            /{N}
          </span>
        </span>
        {/* Only what the visitor chose is announced; autoplay never speaks */}
        <span aria-live="polite" className="sr-only">
          {said}
        </span>
      </span>
      <span className="icon-label">Expertise</span>
    </button>
  );
}
