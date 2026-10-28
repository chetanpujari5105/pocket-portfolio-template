import type { KeyboardEvent } from "react";

import { useOS } from "@/lib/store";

/*
 * Arrow-key navigation between home-screen items. Only keyboard users need it, so it loads the
 * first time anything on the home screen takes focus (HomeScreen), not with the first page.
 */

/**
 * Shift+F10 or the menu key opens the focused item's menu (not every browser turns them into a
 * contextmenu event, and Macs have no menu key). Arrows move focus to the nearest home item in
 * their direction; past the edge, they turn the page.
 */
export function onHomeKey(event: KeyboardEvent<HTMLDivElement>, pages: number, goToPage: (page: number, focus: "first" | "last") => void) {
  if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
    const entry = (event.target as Element).closest<HTMLElement>("[data-home-key], [data-dock-key]");
    const key = entry?.dataset.homeKey ?? entry?.dataset.dockKey;
    if (key && !useOS.getState().wiggle) {
      event.preventDefault();
      useOS.getState().setHomeSheet({ kind: "menu", key });
    }
    return;
  }
  const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (!dir || event.ctrlKey || event.metaKey || useOS.getState().wiggle) return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-nav]")].filter((el) => !el.closest("[inert]"));
  const current = document.activeElement as HTMLElement | null;
  if (!current || !items.includes(current)) return;
  event.preventDefault();
  const from = current.getBoundingClientRect();
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  // Only items fully past the current item's edge in that direction
  const ahead = (r: DOMRect) =>
    dir[0] > 0 ? r.left >= from.right - 4 : dir[0] < 0 ? r.right <= from.left + 4 : dir[1] > 0 ? r.top >= from.bottom - 4 : r.bottom <= from.top + 4;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const item of items) {
    if (item === current) continue;
    const r = item.getBoundingClientRect();
    if (!ahead(r)) continue;
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - cy;
    const score = dx * dir[0] + dy * dir[1] + (Math.abs(dx * dir[1]) + Math.abs(dy * dir[0])) * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }
  if (best) best.focus();
  else if (dir[0] && current.closest("[data-home-page]")) {
    const page = useOS.getState().homePage + dir[0];
    if (page >= 0 && page < pages) goToPage(page, dir[0] > 0 ? "first" : "last");
  }
}
