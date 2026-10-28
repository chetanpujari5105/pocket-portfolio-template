import type { AppId } from "@content/schema";

import { homePagerX } from "./motion";

/** A rectangle in the screen's own (untransformed) coordinates. */
export type Rect = { x: number; y: number; w: number; h: number; r: number };

/** The screen's layout size and corner radius. */
export type ScreenBox = { W: number; H: number; screenR: number };

/*
 * Where an app window grows from and collapses back into. Usually its home-screen icon, but a
 * widget or an app-switcher card can claim the next launch of an app. An element is measured
 * right away, at the tap, while layout is still clean: measured after the window and its app
 * are in the DOM, the same reads would force a layout of the whole new app first.
 */
let pending: { app: AppId; el?: HTMLElement; rect?: Rect; screen?: ScreenBox } | null = null;

export function setLaunchOrigin(app: AppId, source: HTMLElement | Rect) {
  if (!(source instanceof HTMLElement)) {
    pending = { app, rect: source };
    return;
  }
  const screen = source.closest<HTMLElement>("[data-screen]");
  pending = screen ? { app, rect: layoutBox(screen, source), screen: screenBox(screen) } : { app, el: source };
}

export function screenBox(screen: HTMLElement): ScreenBox {
  return {
    W: screen.clientWidth,
    H: screen.clientHeight,
    screenR: parseFloat(getComputedStyle(screen).borderTopLeftRadius) || 0,
  };
}

/** The launch (or close) geometry: origin rect plus the screen box, from the tap when it was measured there. */
export function launchGeometry(screen: HTMLElement, app: AppId, consume: boolean): Rect & ScreenBox {
  const box = (pending?.app === app && pending.screen) || screenBox(screen);
  return { ...originRect(screen, app, consume), ...box };
}

/** Layout box of `el` relative to `screen`, ignoring transforms (the screen may sit in 3D). */
function layoutBox(screen: HTMLElement, el: HTMLElement): Rect {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== screen) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  // Icons on the home pager move with it
  if (el.closest("[data-home-page]")) x += homePagerX.get();
  const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || el.offsetWidth * 0.23;
  return { x, y, w: el.offsetWidth, h: el.offsetHeight, r };
}

const visible = (screen: HTMLElement, b: Rect) => b.x + b.w > 0 && b.x < screen.clientWidth;

/**
 * The rect an app launches from / closes into: the claimed origin if any (consumed once),
 * else the app's icon if it is on the visible home page, else a small tile in the middle.
 */
export function originRect(screen: HTMLElement, app: AppId, consume: boolean): Rect {
  const claim = pending?.app === app ? pending : null;
  if (consume) pending = null;
  if (claim?.rect) return claim.rect;
  const W = screen.clientWidth;
  const H = screen.clientHeight;
  const candidates = [
    claim?.el?.isConnected ? claim.el : null,
    screen.querySelector<HTMLElement>(`[data-dock] [data-icon-tile="${app}"]`),
    screen.querySelector<HTMLElement>(`[data-icon-tile="${app}"]`),
  ];
  for (const el of candidates) {
    if (!el) continue;
    const box = layoutBox(screen, el);
    if (visible(screen, box)) return box;
  }
  const size = Math.min(W, H) * 0.16;
  return { x: (W - size) / 2, y: (H - size) / 2, w: size, h: size, r: size * 0.23 };
}
