/*
 * Small helpers around @use-gesture/react so every gesture hands its velocity to a spring the
 * same way. use-gesture reports velocity as an absolute px/ms per axis plus a direction sign.
 */

type GestureLike = { velocity: [number, number]; direction: [number, number] };

/** Signed release velocity in px/s on one axis (0 = x, 1 = y). */
export function releaseVelocity(state: GestureLike, axis: 0 | 1) {
  return state.velocity[axis] * state.direction[axis] * 1000;
}

/** True when a pointer event started inside an element that owns its own gestures. */
export function startedIn(event: Event | undefined, selector: string) {
  const target = event?.target as Element | null | undefined;
  return !!target?.closest?.(selector);
}

/** Phones whose browser has its own edge swipe-back (iOS Safari / Chrome, not installed PWAs). */
export function hasBrowserEdgeSwipe() {
  if (typeof window === "undefined") return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone && window.matchMedia("(pointer: coarse) and (max-width: 599.98px)").matches;
}

/**
 * In-app edge-swipe zone (px from the screen's left edge). Where the browser owns the outermost
 * strip, ours starts just inside it so the two never fight; Back from either path ends the same.
 */
export function edgeZone(): [number, number] {
  return hasBrowserEdgeSwipe() ? [14, 40] : [0, 24];
}
