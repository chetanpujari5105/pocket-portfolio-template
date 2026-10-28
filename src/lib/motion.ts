import { useMemo } from "react";
import { animateSingleValue, motionValue, useTransform, type MotionValue, type Transition, type ValueAnimationTransition } from "motion/react";

/*
 * One motion system for the whole OS. Everything a visitor can touch moves on a named spring,
 * starts from its current on-screen value and inherits the gesture's velocity, so any animation
 * can be grabbed or reversed mid-flight.
 */

type Spring = { type: "spring"; stiffness: number; damping: number; mass: number; restDelta?: number; restSpeed?: number };
const spring = (stiffness: number, damping: number, rest?: Pick<Spring, "restDelta" | "restSpeed">): Spring => ({
  type: "spring",
  stiffness,
  damping,
  mass: 1,
  ...rest,
});
/*
 * Window progress runs 0 → 1, where Motion's default rest test (0.01 per second) keeps a spring
 * ticking long after the eye stops seeing movement; 0.003 of a screen is under a pixel.
 */
const PROGRESS_REST = { restDelta: 0.003, restSpeed: 0.05 };

export const springs = {
  /** Presses, toggles, selection indicators */
  snappy: spring(500, 40),
  /** Sheets, pushed views, overscroll return */
  smooth: spring(300, 32),
  /** Icons flying in, larger surfaces settling */
  gentle: spring(170, 26),
  /** App launch: icon → full screen, settled in ~320 ms, readable (40%) by ~70 ms */
  launch: spring(420, 38, PROGRESS_REST),
  /** App close back into its icon, ~270 ms */
  home: spring(520, 44, PROGRESS_REST),
  /** Release after a press: a touch of overshoot so it feels physical */
  release: spring(600, 24),
} as const;

export type SpringName = keyof typeof springs;

/** A named spring that hands off a gesture's velocity (units per second). */
export const withVelocity = (name: SpringName, velocity = 0): Transition => ({ ...springs[name], velocity });

/**
 * Animates one motion value (or a plain number, read through `onUpdate`). The home screen only
 * ever moves values, so it uses this instead of `animate`, which also carries sequences and
 * element animation; that keeps them out of the first-load bundle.
 */
export function animateTo(value: MotionValue<number> | number, target: number, transition?: ValueAnimationTransition<number>) {
  return animateSingleValue(value, target, transition);
}

/** Strong ease-out, kept only for opacity crossfades (reduced motion). */
export const easeOut = [0.23, 1, 0.32, 1] as const;
export const fadeTransition: Transition = { duration: 0.2, ease: easeOut };

/**
 * Rubber-band: how far something moves when dragged `x` px past its limit.
 * Standard formula `(1 − 1/(x·c/d + 1))·d`; never exceeds `d`, follows 1:1·c at first.
 */
export function rubberBand(x: number, d: number, c = 0.55) {
  const sign = Math.sign(x);
  const a = Math.abs(x);
  return sign * (1 - 1 / ((a * c) / d + 1)) * d;
}

/** Clamps `value` to [min, max], rubber-banding past either end over `d` px. */
export function rubberClamp(value: number, min: number, max: number, d: number) {
  if (value < min) return min + rubberBand(value - min, d);
  if (value > max) return max + rubberBand(value - max, d);
  return value;
}

/** A motion value that rubber-bands another one past `limit` (in either direction). */
export function useRubberBand(value: MotionValue<number>, limit: number) {
  return useTransform(value, (v) => rubberBand(v, limit));
}

/**
 * Where a flick will come to rest: current position + exponential-decay projection.
 * `velocity` in px/s; deceleration 0.998 ≈ normal scroll.
 */
export function project(velocity: number, deceleration = 0.998) {
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

/** Short haptic tick on phones that support it (jiggle entry, switcher, unlock threshold). */
export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not allowed (no user activation yet) — the visual micro-bounce carries it.
  }
}

/** Only hint the compositor while something is actually moving. */
export function useWillChange(active: boolean, props = "transform") {
  return useMemo(() => (active ? props : "auto"), [active, props]);
}

/* ───────────── Shared progress values (read by several layers at once) ───────────── */

/** 0 = app collapsed into its icon, 1 = app fills the screen. */
export const launchProgress = motionValue(0);
/** 0 = window at rest, 1 = dragged all the way (scale 0.6) by the home indicator. */
export const dismissProgress = motionValue(0);
/** 0 = home, 1 = Search fully open (pull-down or button). */
export const searchProgress = motionValue(0);
/** 0 = lock screen down, 1 = unlocked. */
export const unlockProgress = motionValue(1);
/** 0 = control panel closed, 1 = open. */
export const panelProgress = motionValue(0);
/** Home pager offset in px (negative = later pages). */
export const homePagerX = motionValue(0);

/** Home screen scale while an app is open. */
export const HOME_SCALE_OPEN = 0.9;

/** How far the home screen recedes behind an open app: 0 = not at all, 1 = fully (0.9, dim, blur). */
export function useRecede() {
  return useTransform([launchProgress, dismissProgress], ([p, d]: number[]) => Math.max(0, Math.min(1.05, p)) * (1 - d));
}

/** Velocity (px/ms) above which a swipe commits regardless of distance. */
export const FLICK_VELOCITY = 0.5;
