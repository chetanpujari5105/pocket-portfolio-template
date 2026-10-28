import { appsLayout, askApp } from "@content/apps";
import { profile } from "@content/profile";
import type { HomeItem } from "@content/schema";

/*
 * The home screen as data: an ordered grid that flows across as many pages as it needs, a dock
 * of up to four, and folders. Everything a visitor changes in edit mode is saved per browser as
 * `pp-home-v2`. Grid and dock entries are tile ids, `f:<folder id>` or `w:<widget id>`.
 */

export type WidgetId = "impact" | "work" | "github" | "blog" | "youtube" | "expertise";

/** Grid cells each widget takes (wide ones shrink to the column count on narrow screens). */
export const WIDGETS: Record<WidgetId, { w: number; h: number; label: string }> = {
  impact: { w: 4, h: 2, label: "Impact" },
  work: { w: 2, h: 2, label: "Services" },
  github: { w: 4, h: 2, label: "GitHub" },
  blog: { w: 4, h: 2, label: "Blog" },
  youtube: { w: 2, h: 2, label: "YouTube" },
  expertise: { w: 2, h: 2, label: "Expertise" },
};

export type Folder = { name: string; items: string[] };
export type HomeLayout = { v: 2; grid: string[]; dock: string[]; folders: Record<string, Folder> };

export const HOME_KEY = "pp-home-v2";
/** v1 saved only the order of the page-1 icons */
export const LEGACY_ORDER_KEY = "pp-icon-order";
export const DOCK_MAX = 4;
/** Always on the home screen, so a visitor can get everything back */
export const PINNED = "settings";

export const isFolder = (key: string) => key.startsWith("f:");
export const isWidget = (key: string) => key.startsWith("w:");
export const folderId = (key: string) => key.slice(2);
export const widgetId = (key: string) => key.slice(2) as WidgetId;

const ENABLE_ASK = process.env.NEXT_PUBLIC_ENABLE_ASK === "true";

/* ───────────── Tiles: every app and brand link that can sit on the home screen ───────────── */

const SOCIAL_TILES: HomeItem[] = profile.socials.map((s) => ({
  id: s.id,
  label: s.label,
  icon: "at",
  colors: ["#000000", "#000000"],
  href: s.url,
  brand: s.id,
}));

export const TILES: Record<string, HomeItem> = Object.fromEntries(
  [
    ...SOCIAL_TILES,
    ...appsLayout.block,
    ...appsLayout.row.filter((i) => i.id !== "socials"),
    ...appsLayout.links,
    ...appsLayout.dock,
    ...(ENABLE_ASK ? [askApp] : []),
  ].map((item) => [item.id, item]),
);

/* ───────────── Default layout, v1 migration, validation ───────────── */

const PAGE_TWO = ["w:github", "w:blog", "w:youtube", "w:expertise"];
const FIRST_PAGE_ICONS = [...appsLayout.block, ...appsLayout.row, ...appsLayout.links].map((i) =>
  i.id === "socials" ? "f:socials" : i.id,
);

export function defaultLayout(): HomeLayout {
  const onHome = new Set([...FIRST_PAGE_ICONS, ...appsLayout.dock.map((i) => i.id)]);
  // Sanitized like a saved layout, so a Socials folder left with fewer than two profiles
  // dissolves into the grid instead of showing an empty tile
  return sanitize({
    v: 2,
    grid: ["w:impact", "w:work", ...FIRST_PAGE_ICONS, ...(ENABLE_ASK ? ["ask"] : []), ...PAGE_TWO],
    dock: appsLayout.dock.map((i) => i.id),
    folders: {
      // The brand links that aren't on page 1 themselves
      socials: { name: "Socials", items: profile.socials.map((s) => s.id).filter((id) => !onHome.has(id)) },
    },
  })!;
}

/** v1 (`pp-icon-order`): the page-1 icons in the visitor's order, everything else as default. */
export function migrateOrder(order: string[]): HomeLayout {
  const base = defaultLayout();
  const known = order.map((id) => (id === "socials" ? "f:socials" : id)).filter((id) => FIRST_PAGE_ICONS.includes(id));
  const icons = [...new Set([...known, ...FIRST_PAGE_ICONS])];
  const rest = base.grid.filter((k) => !FIRST_PAGE_ICONS.includes(k) && k !== "w:impact" && k !== "w:work");
  return sanitize({ ...base, grid: ["w:impact", "w:work", ...icons, ...rest] })!;
}

/**
 * Repairs anything a saved layout (or an edit) could get wrong: unknown or duplicate ids,
 * one-app folders, an overfull dock, missing widgets, and Settings must stay reachable.
 */
export function sanitize(raw: unknown): HomeLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Partial<HomeLayout>;
  if (input.v !== 2 || !Array.isArray(input.grid) || !Array.isArray(input.dock)) return null;
  const seen = new Set<string>();
  const folders: Record<string, Folder> = {};
  for (const [id, f] of Object.entries(input.folders ?? {})) {
    if (!f || typeof f.name !== "string" || !Array.isArray(f.items)) continue;
    const items = f.items.filter((t): t is string => typeof t === "string" && t in TILES && !seen.has(t) && !!seen.add(t));
    folders[id] = { name: f.name.slice(0, 40) || "Folder", items };
  }
  const clean = (list: unknown[]) =>
    list.filter((k): k is string => {
      if (typeof k !== "string" || seen.has(k)) return false;
      const ok = isFolder(k) ? folderId(k) in folders : isWidget(k) ? widgetId(k) in WIDGETS : k in TILES;
      if (ok) seen.add(k);
      return ok;
    });
  const docked = clean(input.dock.filter((k) => !isWidget(String(k))));
  const dock = docked.slice(0, DOCK_MAX);
  // A dock entry over the limit falls back to the grid
  const overflow = docked.slice(DOCK_MAX);
  overflow.forEach((k) => seen.delete(k));
  const grid = clean([...input.grid, ...overflow]);
  for (const id of Object.keys(WIDGETS)) if (!seen.has(`w:${id}`)) grid.push(`w:${id}`);
  // Folders that aren't placed anywhere, or hold fewer than two apps, dissolve into the grid
  for (const [id, f] of Object.entries(folders)) {
    const key = `f:${id}`;
    const placedAt = grid.includes(key) ? grid : dock.includes(key) ? dock : null;
    if (f.items.length >= 2 && placedAt) continue;
    delete folders[id];
    const list = placedAt ?? grid;
    const at = list.indexOf(key);
    if (at >= 0) list.splice(at, 1, ...f.items);
    else grid.push(...f.items);
  }
  if (!grid.includes(PINNED) && !dock.includes(PINNED) && !Object.values(folders).some((f) => f.items.includes(PINNED)))
    grid.push(PINNED);
  return { v: 2, grid, dock, folders };
}

export function readHome(): HomeLayout {
  try {
    const saved = localStorage.getItem(HOME_KEY);
    if (saved) {
      const layout = sanitize(JSON.parse(saved));
      if (layout) return layout;
    }
    const legacy: unknown = JSON.parse(localStorage.getItem(LEGACY_ORDER_KEY) ?? "null");
    if (Array.isArray(legacy) && legacy.every((x) => typeof x === "string")) return migrateOrder(legacy);
  } catch {
    // Unreadable storage: the default layout
  }
  return defaultLayout();
}

export function writeHome(layout: HomeLayout) {
  try {
    localStorage.setItem(HOME_KEY, JSON.stringify(layout));
    localStorage.removeItem(LEGACY_ORDER_KEY);
  } catch {
    // Blocked storage: the layout lasts until reload
  }
}

/* ───────────── Geometry: fit the grid to the space the screen actually has ───────────── */

export type HomeGeometry = {
  cols: number;
  rows: number;
  /** Icon tile size, px (48–68) */
  icon: number;
  cellW: number;
  /** Icon + label */
  cellH: number;
  gapX: number;
  gapY: number;
  padX: number;
  /** Space above the grid (status bar) */
  top: number;
  /** Bottom inset under the dock */
  bottom: number;
  /** Search pill row height and the dock's vertical padding */
  search: number;
  dockPad: number;
  landscape: boolean;
};

const MIN_ICON = 48;
const MAX_ICON = 68;
/** Label line + the gap above it */
const LABEL = 19;
/** Search pill row: 10 px clear above the 28 px pill, 8 px below (landscape: 8 / 8) */
const SEARCH_ROW = 46;
const SEARCH_ROW_LANDSCAPE = 44;

export type Insets = { top: number; right: number; bottom: number; left: number };

/**
 * Columns, icon size and rows for a screen of `W × H` CSS px. `framed` is the drawn phone on
 * tablets and desktops (it has its own status bar); otherwise the site is the phone.
 */
export function homeGeometry(W: number, H: number, insets: Insets, framed: boolean): HomeGeometry {
  const landscape = !framed && W > H * 1.2;
  const cols = landscape ? (W >= 800 ? 7 : 6) : W < 340 ? 3 : W < 560 ? 4 : W < 760 ? 5 : 6;
  const side = Math.max(insets.left, insets.right);
  const padX = landscape ? Math.max(side, 0) + W * 0.035 : W * 0.056;
  const gapX = landscape ? W * 0.026 : W * 0.042;
  const cellW = (W - padX * 2 - gapX * (cols - 1)) / cols;
  // Phones: a band for edit mode's Done / + pills and the status pill's messages
  const top = framed ? H * 0.074 : insets.top + (landscape ? 30 : 34);
  const bottom = framed ? H * 0.014 : Math.max(insets.bottom, landscape ? 6 : 8);
  // Rows a phone page is designed for; the icon shrinks toward 48 px before a row is given up
  const target = landscape ? 3 : 6;
  const fromWidth = cellW * 0.84;
  const search = landscape ? SEARCH_ROW_LANDSCAPE : SEARCH_ROW;
  const padRatio = landscape ? 0.15 : 0.2;
  const fixed = H - top - bottom - search - LABEL * target;
  const fromHeight = fixed / (target + 0.22 * (target - 1) + 1 + padRatio * 2);
  const icon = Math.floor(Math.min(MAX_ICON, Math.max(MIN_ICON, Math.min(fromWidth, fromHeight))) * 10) / 10;
  const cellH = icon + LABEL;
  const dockPad = Math.max(landscape ? 7 : 10, icon * padRatio);
  const area = H - top - bottom - search - (icon + dockPad * 2);
  const minGap = landscape ? 8 : Math.max(8, icon * 0.22);
  // As many rows as fit, up to the page the screen is designed for; spare height opens the rows up
  const rows = Math.max(2, Math.min(target, Math.floor((area + minGap) / (cellH + minGap) + 0.02)));
  const gapY = Math.min(icon * 0.5, Math.max(minGap, (area - rows * cellH) / (rows - 1)));
  return { cols, rows, icon, cellW, cellH, gapX, gapY, padX, top, bottom, search, dockPad, landscape };
}

/* ───────────── Pages: items flow in order; widgets take whole cells ───────────── */

export type Placed = { key: string; page: number; col: number; row: number; w: number; h: number };

export function sizeOf(key: string, cols: number, rows: number) {
  if (!isWidget(key)) return { w: 1, h: 1 };
  const size = WIDGETS[widgetId(key)];
  return { w: Math.min(size.w, cols), h: Math.min(size.h, rows) };
}

/**
 * Places every grid entry on the first free cells that fit it on the current page (so apps fill
 * in beside a 2×2 widget), moving on to a new page when nothing fits. Never backfills an
 * earlier page, so the order a visitor sees always reads forward. A widget never squashes: one
 * that doesn't fit in what's left of a page starts the next one.
 */
export function paginate(grid: string[], cols: number, rows: number) {
  const pages: boolean[][][] = [];
  const placed: Placed[] = [];
  const cellsOf = (p: number) => (pages[p] ??= Array.from({ length: rows }, () => Array<boolean>(cols).fill(false)));
  const fits = (p: number, r: number, c: number, w: number, h: number) => {
    if (c + w > cols || r + h > rows) return false;
    const cells = cellsOf(p);
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (cells[y][x]) return false;
    return true;
  };
  let page = 0;
  for (const key of grid) {
    const { w, h } = sizeOf(key, cols, rows);
    let spot: { r: number; c: number } | null = null;
    while (!spot) {
      for (let r = 0; r < rows && !spot; r++) for (let c = 0; c < cols && !spot; c++) if (fits(page, r, c, w, h)) spot = { r, c };
      if (!spot) page++;
    }
    const cells = cellsOf(page);
    for (let y = spot.r; y < spot.r + h; y++) for (let x = spot.c; x < spot.c + w; x++) cells[y][x] = true;
    placed.push({ key, page, col: spot.c, row: spot.r, w, h });
  }
  return { placed, pages: Math.max(1, pages.length) };
}
