"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

import {
  DOCK_MAX,
  defaultLayout,
  folderId,
  isFolder,
  isWidget,
  paginate,
  PINNED,
  TILES,
  WIDGETS,
  widgetId,
  type HomeGeometry,
  type HomeLayout,
  type Placed,
} from "@/lib/home";
import {
  addToHome,
  arrayMove,
  hiddenTiles,
  listOf,
  mergeInto,
  place,
  removeEntry,
  type ListName,
} from "@/lib/home-edit";
import { setLaunchOrigin } from "@/lib/launch";
import { animateTo, easeOut, haptic, homePagerX, springs } from "@/lib/motion";
import { folderOf, goBack, openApp, openFolder } from "@/lib/router";
import { prefersReducedMotion, useOS } from "@/lib/store";

import { IconFace } from "./AppIcon";
import { HomeEntry, slotBox } from "./HomeScreen";

/*
 * Home-screen editing, loaded the first time a visitor long-presses or right-clicks the home
 * screen: the "–" badges, Done and + pills, dragging (reorder, dock, folders, paging at the
 * edges), the keyboard equivalents, the context menu, the remove and reset sheets, the App
 * Library, and what a screen reader hears about all of it. Every change goes through
 * `setHome`, which repairs and saves the layout (`pp-home-v2`).
 */

/** Drop-and-hold on an app this long to make a folder */
const MERGE_MS = 400;
/** Hold at a screen edge this long to turn the page */
const EDGE_MS = 600;
/** A move settles this long before the other icons make room (no shuffling on the way past) */
const SETTLE_MS = 150;
/** How close to an icon's centre (× icon size) a drop goes into it rather than beside it */
const MERGE_ZONE = 0.32;

/* ───────────── Small helpers ───────────── */

function labelOf(key: string) {
  const { home } = useOS.getState();
  if (isFolder(key)) return home.folders[folderId(key)]?.name ?? "Folder";
  if (isWidget(key)) return `${WIDGETS[widgetId(key)].label} widget`;
  return TILES[key]?.label ?? key;
}

/** "page 1, row 2, column 3" or "in the dock, 2 of 4" */
function whereIs(key: string) {
  const { home, homeGeo: g } = useOS.getState();
  const d = home.dock.indexOf(key);
  if (d >= 0) return `in the dock, ${d + 1} of ${home.dock.length}`;
  const p = paginate(home.grid, g.cols, g.rows).placed.find(
    (x) => x.key === key,
  );
  return p
    ? `page ${p.page + 1}, row ${p.row + 1}, column ${p.col + 1}`
    : "on the Home Screen";
}

const removable = (key: string) => !isWidget(key) && key !== PINNED;
const entryEl = (key: string) =>
  document.querySelector<HTMLElement>(
    `[data-home-key="${key}"], [data-dock-key="${key}"]`,
  );

/** The screen in its own CSS px: the drawn phone may be scaled (or in the 3D stage). */
function screenFrame() {
  const screen = document.querySelector<HTMLElement>("[data-screen]")!;
  const r = screen.getBoundingClientRect();
  const k = r.width / screen.offsetWidth || 1;
  return {
    W: screen.offsetWidth,
    H: screen.offsetHeight,
    point: (x: number, y: number) => ({
      x: (x - r.left) / k,
      y: (y - r.top) / k,
    }),
    rect: (el: Element) => {
      const b = el.getBoundingClientRect();
      return {
        x: (b.left - r.left) / k,
        y: (b.top - r.top) / k,
        w: b.width / k,
        h: b.height / k,
      };
    },
  };
}

function showPage(page: number) {
  const grid = document.querySelector<HTMLElement>("[data-home-grid]");
  useOS.getState().setHomePage(page);
  animateTo(
    homePagerX,
    -page * (grid?.clientWidth ?? 390),
    prefersReducedMotion() ? { duration: 0 } : springs.smooth,
  );
}

/** Focus an entry once it has rendered where it now lives (turning to its page first). */
function refocus(key: string) {
  const { home, homeGeo: g, homePage } = useOS.getState();
  const p = paginate(home.grid, g.cols, g.rows).placed.find(
    (x) => x.key === key,
  );
  if (p && p.page !== homePage) showPage(p.page);
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      entryEl(key)
        ?.querySelector<HTMLElement>("[data-nav]")
        ?.focus({ preventScroll: true }),
    ),
  );
}

function openEntry(key: string) {
  if (isFolder(key)) return openFolder(folderId(key));
  const item = TILES[key];
  if (item?.href) window.open(item.href, "_blank", "noopener,noreferrer");
  else if (item?.app) {
    const tile = entryEl(key)?.querySelector<HTMLElement>("[data-icon-tile]");
    if (tile) setLaunchOrigin(item.app, tile);
    openApp(item.app);
  }
}

async function shareEntry(key: string) {
  const item = TILES[key];
  if (!item) return;
  const url = item.href ?? `${location.origin}${location.pathname}#${item.app}`;
  try {
    if (navigator.share)
      return await navigator.share({ title: item.label, url });
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(url);
    useOS.getState().showPill("done", "Link copied", "link");
  } catch {
    useOS.getState().showPill("info", url, "link");
  }
}

/* ───────────── Screen-reader announcements ───────────── */

let say: (text: string) => void = () => {};
export const announce = (text: string) => say(text);

function LiveRegion() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    say = (text) => {
      // Cleared first, so the same words twice are still read twice
      setMessage("");
      window.setTimeout(() => setMessage(text), 60);
    };
    return () => {
      say = () => {};
    };
  }, []);
  return (
    <p role="status" aria-live="polite" data-home-announcer className="sr-only">
      {message}
    </p>
  );
}

/* ───────────── Edits shared by drag, keyboard, badges and menus ───────────── */

function requestRemove(key: string) {
  if (key === PINNED)
    return announce(
      "Settings stays on the Home Screen, so everything can always be found again.",
    );
  if (isWidget(key)) return announce("Widgets stay on the Home Screen.");
  useOS.getState().setHomeSheet({ kind: "remove", key });
}

/** `tile` dropped on (or F-ed into) `target`: a new folder opens with its name ready to type. */
function makeFolder(tile: string, target: string) {
  const { home, setHome } = useOS.getState();
  const into = labelOf(target);
  const { layout, id, created } = mergeInto(home, tile, target);
  setHome(layout);
  haptic();
  if (created) {
    const name = useOS.getState().home.folders[id]?.name ?? "Folder";
    announce(
      `Made a folder, ${name}, with ${into} and ${labelOf(tile)}. Type to rename it.`,
    );
    useOS.setState({ renameFolder: id });
    // The grid settles in this frame, the folder opens in the one after (one long frame would be two)
    requestAnimationFrame(() => requestAnimationFrame(() => openFolder(id)));
  } else announce(`Added ${labelOf(tile)} to ${into}.`);
}

/* ───────────── Badges, Done and + (inside the home layer) ───────────── */

function Badge({ entry, style }: { entry: string; style: CSSProperties }) {
  const folders = useOS((s) => s.home.folders);
  const label = isFolder(entry)
    ? (folders[folderId(entry)]?.name ?? "Folder")
    : (TILES[entry]?.label ?? entry);
  return (
    <button
      type="button"
      data-edit-ui
      data-badge-for={entry}
      // Delete on the focused icon does the same, so the badges aren't extra tab stops
      tabIndex={-1}
      aria-label={`Remove ${label}`}
      onClick={() => requestRemove(entry)}
      className="edit-badge pointer-events-auto"
      style={style}
    >
      <span aria-hidden />
    </button>
  );
}

/** Dock badges: placed where the dock's icons actually are (it lays itself out). */
function DockBadges({ dock, icon }: { dock: string[]; icon: number }) {
  const [spots, setSpots] = useState<{ key: string; x: number; y: number }[]>(
    [],
  );
  useEffect(() => {
    // Read once the dock has laid out its new order
    const raf = requestAnimationFrame(() => {
      const grid = document.querySelector("[data-home-grid]");
      if (!grid) return;
      const f = screenFrame();
      const g = f.rect(grid);
      setSpots(
        [...document.querySelectorAll<HTMLElement>("[data-dock-key]")].map(
          (el) => {
            const t = f.rect(el.querySelector("[data-icon-tile]") ?? el);
            return {
              key: el.dataset.dockKey!,
              x: t.x - g.x - 7,
              y: t.y - g.y - 7,
            };
          },
        ),
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [dock, icon]);
  return spots
    .filter((s) => removable(s.key))
    .map((s) => (
      <Badge
        key={s.key}
        entry={s.key}
        style={{
          left: 0,
          top: 0,
          translate: `${s.x}px ${s.y}px`,
          transformOrigin: `${7 + icon / 2}px ${7 + icon / 2}px`,
        }}
      />
    ));
}

export function EditOverlay({
  placed,
  geo,
}: {
  placed: Placed[];
  geo: HomeGeometry;
}) {
  const setWiggle = useOS((s) => s.setWiggle);
  const setHomeSheet = useOS((s) => s.setHomeSheet);
  const dock = useOS((s) => s.homePreview?.dock ?? s.home.dock);
  // An open folder has the screen to itself
  const folderOpen = useOS((s) => s.route.app === "socials");
  // The pills sit in the band above the first row (the layer pads the grid down by `geo.top`)
  const pillTop = Math.max(4, geo.top - 30) - geo.top;
  const origin = `${7 + geo.icon / 2}px ${7 + geo.icon / 2}px`;
  return (
    <>
      <m.div
        style={{ x: homePagerX }}
        className="edit-badges pointer-events-none absolute inset-0"
      >
        {placed.map((p, i) => {
          if (!removable(p.key)) return null;
          const box = slotBox(p, geo);
          return (
            <Badge
              key={p.key}
              entry={p.key}
              style={
                {
                  left: `${p.page * 100}%`,
                  top: 0,
                  translate: `${box.x + (box.w - geo.icon) / 2 - 7}px ${box.y - 7}px`,
                  transformOrigin: origin,
                  // The same phase as its icon (HomeScreen's Pages), so the two wiggle as one
                  "--wiggle-delay": `${-((i * 97) % 260)}ms`,
                } as CSSProperties
              }
            />
          );
        })}
        <DockBadges dock={dock} icon={geo.icon} />
      </m.div>
      {!folderOpen && (
        <>
          <button
            type="button"
            data-edit-ui
            aria-label="Add apps from the App Library"
            onClick={() => setHomeSheet({ kind: "library" })}
            className="glass-dark edit-pill absolute left-[5cqw] z-[78] grid size-[28px] place-items-center rounded-full text-white"
            style={{ top: pillTop }}
          >
            <svg
              viewBox="0 0 12 12"
              aria-hidden
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M6 1.5v9M1.5 6h9" />
            </svg>
          </button>
          <button
            type="button"
            data-edit-ui
            data-edit-done
            onClick={() => setWiggle(false)}
            className="glass-dark edit-pill absolute right-[5cqw] z-[78] h-[28px] rounded-full px-3 text-[13px] font-semibold text-white"
            style={{ top: pillTop }}
          >
            Done
          </button>
        </>
      )}
    </>
  );
}

/* ───────────── Dragging ───────────── */

type Target =
  | { kind: "move"; list: ListName; index: number }
  | { kind: "merge"; key: string }
  | { kind: "edge"; dir: number };
type Ghost = { key: string; w: number; h: number; x: number; y: number };
type Drag = {
  key: string;
  id: number;
  /** Dragged out of this folder (still inside its panel while `inFolder`) */
  folder: string | null;
  inFolder: boolean;
  ox: number;
  oy: number;
  /** Pointer, in screen px and in client px */
  x: number;
  y: number;
  cx: number;
  cy: number;
  target: string;
  /** Where the pointer last came to rest: targets only count once it has stopped there */
  restX: number;
  restY: number;
  since: number;
  /** Armed folder target (held long enough) */
  merge: string | null;
  timer: number;
};

/** Where a drop at screen point (x, y) would go, given the grid and dock as they look now. */
function targetAt(drag: Drag, x: number, y: number): Target | null {
  const s = useOS.getState();
  const geo = s.homeGeo;
  const preview = s.homePreview ?? s.home;
  const key = drag.key;
  const widget = isWidget(key);
  const f = screenFrame();

  const dockEl = document.querySelector("[data-dock]");
  if (dockEl && y >= f.rect(dockEl).y - 6) {
    if (widget) return null;
    const items = [...dockEl.querySelectorAll<HTMLElement>("[data-dock-key]")]
      .filter((el) => el.dataset.dockKey !== key)
      .map((el) => {
        const b = f.rect(el);
        return { key: el.dataset.dockKey!, cx: b.x + b.w / 2 };
      });
    const near = items.find((i) => Math.abs(i.cx - x) < geo.icon * MERGE_ZONE);
    if (near && !isFolder(key)) return { kind: "merge", key: near.key };
    // A full dock takes nothing more (but its own icons can still move around in it)
    if (!preview.dock.includes(key) && items.length >= DOCK_MAX) return null;
    return {
      kind: "move",
      list: "dock",
      index: items.filter((i) => i.cx < x).length,
    };
  }

  const gridEl = document.querySelector<HTMLElement>("[data-home-grid]");
  if (!gridEl) return null;
  const g = f.rect(gridEl);
  const gx = x - g.x;
  const gy = y - g.y;
  if (gy < -16 || gy > g.h + 4) return null;
  const { placed, pages } = paginate(preview.grid, geo.cols, geo.rows);
  const page = s.homePage;
  if (gx < 14 && page > 0) return { kind: "edge", dir: -1 };
  if (gx > g.w - 14 && page < pages - 1) return { kind: "edge", dir: 1 };
  const on = placed
    .filter((p) => p.page === page)
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const without = preview.grid.filter((k) => k !== key);
  const hit = on.find((p) => {
    const b = slotBox(p, geo);
    return (
      gx >= b.x - geo.gapX / 2 &&
      gx < b.x + b.w + geo.gapX / 2 &&
      gy >= b.y - geo.gapY / 2 &&
      gy < b.y + b.h + geo.gapY / 2
    );
  });
  if (hit) {
    // Over its own (empty) place: stay
    if (hit.key === key) return null;
    const b = slotBox(hit, geo);
    if (
      hit.w === 1 &&
      hit.h === 1 &&
      !widget &&
      !isFolder(key) &&
      !isWidget(hit.key)
    ) {
      const dx = gx - (b.x + b.w / 2);
      const dy = gy - (b.y + geo.icon / 2);
      if (
        Math.abs(dx) < geo.icon * MERGE_ZONE &&
        Math.abs(dy) < geo.icon * MERGE_ZONE
      )
        return { kind: "merge", key: hit.key };
    }
    // Moving forward lands after the icon it's over, moving back lands before it (they swap)
    const from = preview.grid.indexOf(key);
    const i = without.indexOf(hit.key);
    return {
      kind: "move",
      list: "grid",
      index: from >= 0 && from < preview.grid.indexOf(hit.key) ? i + 1 : i,
    };
  }
  // An empty cell: before the next entry on this page in reading order, else after the page's last
  const row = Math.floor(gy / (geo.cellH + geo.gapY));
  const col = Math.floor(
    (gx - geo.padX + geo.gapX / 2) / (geo.cellW + geo.gapX),
  );
  const rest = on.filter((p) => p.key !== key);
  const next = rest.find((p) => p.row > row || (p.row === row && p.col > col));
  if (next)
    return { kind: "move", list: "grid", index: without.indexOf(next.key) };
  const last = rest.reduce<string | null>(
    (acc, p) =>
      acc === null || without.indexOf(p.key) > without.indexOf(acc)
        ? p.key
        : acc,
    null,
  );
  return {
    kind: "move",
    list: "grid",
    index: last ? without.indexOf(last) + 1 : without.length,
  };
}

const sameLists = (
  a: { grid: string[]; dock: string[] },
  b: { grid: string[]; dock: string[] },
) => a.grid.join() === b.grid.join() && a.dock.join() === b.dock.join();

function markMerge(key: string | null) {
  document
    .querySelectorAll("[data-merge]")
    .forEach((el) => el.removeAttribute("data-merge"));
  if (key) entryEl(key)?.setAttribute("data-merge", "");
}

/**
 * Pointer dragging in edit mode, for mouse, touch and pen alike. A drag starts 6 px into a press
 * on any icon, widget, dock icon or folder app (or straight on from the long-press that started
 * edit mode). The grid shows where the icon would land as it moves; holding still on another
 * app makes a folder; holding at a screen edge turns the page.
 */
function useDragging(
  ghostRef: RefObject<HTMLDivElement | null>,
  setGhost: (ghost: Ghost | null) => void,
) {
  const wiggle = useOS((s) => s.wiggle);
  useEffect(() => {
    const screen = document.querySelector<HTMLElement>("[data-screen]");
    if (!wiggle || !screen) return;
    type Pending = {
      key: string;
      x: number;
      y: number;
      id: number | null;
      folder: string | null;
    };
    const press = useOS.getState().editPress;
    let pending: Pending | null = press
      ? { ...press, id: null, folder: null }
      : null;
    let drag: Drag | null = null;
    let swallowClicksUntil = 0;

    const moveGhost = (d: Drag) => {
      if (ghostRef.current)
        ghostRef.current.style.transform = `translate3d(${d.x - d.ox}px, ${d.y - d.oy}px, 0)`;
    };

    const start = (p: Pending, e: PointerEvent) => {
      const { home, homeGeo: geo } = useOS.getState();
      if (!p.folder && !listOf(home, p.key)) return;
      const f = screenFrame();
      const at = f.point(e.clientX, e.clientY);
      const startAt = f.point(p.x, p.y);
      const source = p.folder
        ? document.querySelector(`[data-folder-item="${p.key}"]`)
        : entryEl(p.key);
      if (!source) return;
      // The ghost is the icon at home size (no label); a widget keeps its own size
      let w = geo.cellW;
      let h = geo.icon;
      let ox = w / 2;
      let oy = h / 2;
      if (isWidget(p.key)) {
        const b = f.rect(source);
        ({ w, h } = b);
        ox = startAt.x - b.x;
        oy = startAt.y - b.y;
      } else if (!p.folder) {
        const tile = source.querySelector("[data-icon-tile]");
        if (tile) {
          const t = f.rect(tile);
          ox = startAt.x - (t.x - (w - t.w) / 2);
          oy = startAt.y - t.y;
        }
      }
      drag = {
        key: p.key,
        id: e.pointerId,
        folder: p.folder,
        inFolder: !!p.folder,
        ox,
        oy,
        x: at.x,
        y: at.y,
        cx: e.clientX,
        cy: e.clientY,
        target: "",
        restX: at.x,
        restY: at.y,
        since: 0,
        merge: null,
        timer: 0,
      };
      useOS.setState({
        homePreview: { grid: home.grid, dock: home.dock },
        editPress: null,
      });
      setGhost({ key: p.key, w, h, x: at.x - ox, y: at.y - oy });
      haptic();
      drag.timer = window.setInterval(evaluate, 50);
    };

    /** Inside the open folder: rearrange its apps; dragged out past its edge, the folder closes. */
    const evaluateFolder = (d: Drag) => {
      const panel = document.querySelector("[data-folder-panel]");
      const f = screenFrame();
      const b = panel ? f.rect(panel) : null;
      if (
        !b ||
        d.x < b.x - 12 ||
        d.x > b.x + b.w + 12 ||
        d.y < b.y - 12 ||
        d.y > b.y + b.h + 12
      ) {
        d.inFolder = false;
        goBack();
        announce(
          `${labelOf(d.key)} is out of the folder. Drop it anywhere on the Home Screen.`,
        );
        return;
      }
      const over = document
        .elementsFromPoint(d.cx, d.cy)
        .map(
          (el) =>
            el.closest<HTMLElement>("[data-folder-item]")?.dataset.folderItem,
        )
        .find((k) => k && k !== d.key);
      const now = performance.now();
      if ((over ?? "") !== d.target) {
        d.target = over ?? "";
        d.since = now;
      }
      if (!over || now - d.since < SETTLE_MS * 2 || !d.folder) return;
      const { home, setHome } = useOS.getState();
      const folder = home.folders[d.folder];
      if (!folder) return;
      const next = arrayMove(
        folder.items,
        folder.items.indexOf(d.key),
        folder.items.indexOf(over),
      );
      setHome({
        ...home,
        folders: { ...home.folders, [d.folder]: { ...folder, items: next } },
      });
      d.target = "";
    };

    const evaluate = () => {
      const d = drag;
      if (!d) return;
      if (d.inFolder) return evaluateFolder(d);
      const t = targetAt(d, d.x, d.y);
      const signature = t ? JSON.stringify(t) : "";
      const now = performance.now();
      if (signature !== d.target) {
        d.target = signature;
        d.since = now;
        if (d.merge) {
          d.merge = null;
          markMerge(null);
        }
      }
      if (!t) return;
      const held = now - d.since;
      if (t.kind === "edge") {
        if (held >= EDGE_MS) {
          showPage(useOS.getState().homePage + t.dir);
          d.since = now;
        }
      } else if (t.kind === "merge") {
        if (held >= MERGE_MS && d.merge !== t.key) {
          d.merge = t.key;
          markMerge(t.key);
          haptic();
        }
      } else if (held >= SETTLE_MS) {
        const s = useOS.getState();
        const current = s.homePreview ?? s.home;
        const next = place(current, d.key, t.list, t.index);
        if (!sameLists(next, current))
          useOS.setState({ homePreview: { grid: next.grid, dock: next.dock } });
      }
    };

    const drop = (cancelled: boolean) => {
      const d = drag;
      if (!d) return;
      drag = null;
      window.clearInterval(d.timer);
      markMerge(null);
      setGhost(null);
      // The one click the drop itself produces (it comes straight after the pointerup)
      swallowClicksUntil = performance.now() + 100;
      const s = useOS.getState();
      const preview = s.homePreview;
      useOS.setState({ homePreview: null });
      if (cancelled || !preview || d.inFolder) return;
      if (d.merge) return makeFolder(d.key, d.merge);
      const layout: HomeLayout = {
        ...s.home,
        grid: preview.grid,
        dock: preview.dock,
      };
      if (d.folder) {
        const folder = s.home.folders[d.folder];
        if (folder)
          layout.folders = {
            ...s.home.folders,
            [d.folder]: {
              ...folder,
              items: folder.items.filter((t) => t !== d.key),
            },
          };
        // Out of the folder but not dropped anywhere in particular: the end of the grid
        if (!listOf(layout, d.key)) layout.grid = [...layout.grid, d.key];
      }
      const before = whereIs(d.key);
      s.setHome(layout);
      const after = whereIs(d.key);
      if (after !== before || d.folder)
        announce(`${labelOf(d.key)} moved: ${after}.`);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || drag || useOS.getState().homeSheet) return;
      const target = e.target as Element;
      if (target.closest("[data-edit-ui]")) return;
      const el = target.closest<HTMLElement>(
        "[data-home-key], [data-dock-key], [data-folder-item]",
      );
      if (!el) return;
      const folder = el.dataset.folderItem
        ? folderOf(useOS.getState().route)
        : null;
      pending = {
        key: (el.dataset.homeKey ??
          el.dataset.dockKey ??
          el.dataset.folderItem)!,
        x: e.clientX,
        y: e.clientY,
        id: e.pointerId,
        folder,
      };
    };
    const onMove = (e: PointerEvent) => {
      if (drag) {
        if (e.pointerId !== drag.id) return;
        const at = screenFrame().point(e.clientX, e.clientY);
        Object.assign(drag, { x: at.x, y: at.y, cx: e.clientX, cy: e.clientY });
        // Still moving: nothing makes room yet (on the way to an app's centre, its edge mustn't
        // shuffle it away before a folder can form)
        if (Math.hypot(at.x - drag.restX, at.y - drag.restY) > 6) {
          drag.restX = at.x;
          drag.restY = at.y;
          drag.since = performance.now();
        }
        moveGhost(drag);
        evaluate();
        return;
      }
      if (
        !pending ||
        (pending.id !== null && pending.id !== e.pointerId) ||
        !(e.buttons & 1)
      )
        return;
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) < 6) return;
      const p = pending;
      pending = null;
      start(p, e);
    };
    const onUp = (e: PointerEvent) => {
      pending = null;
      if (drag && e.pointerId === drag.id) drop(e.type === "pointercancel");
    };
    // The click a drag ends with shouldn't also open, or leave edit mode
    const onClick = (e: MouseEvent) => {
      if (performance.now() < swallowClicksUntil) {
        swallowClicksUntil = 0;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    screen.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    window.addEventListener("click", onClick, true);
    return () => {
      screen.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      window.removeEventListener("click", onClick, true);
      if (drag) {
        window.clearInterval(drag.timer);
        markMerge(null);
        setGhost(null);
      }
    };
  }, [wiggle, ghostRef, setGhost]);
}

/* ───────────── Keyboard: arrows move the focused icon, Delete removes it, F makes a folder ───────────── */

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** The entry next to `key` in an arrow's direction, on this page or in the dock. */
function neighbour(key: string, [dx, dy]: [number, number]) {
  const from = entryEl(key)?.getBoundingClientRect();
  if (!from) return null;
  const page = useOS.getState().homePage;
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const el of document.querySelectorAll<HTMLElement>(
    `[data-home-page="${page}"] [data-home-key], [data-dock-key]`,
  )) {
    const other = (el.dataset.homeKey ?? el.dataset.dockKey)!;
    if (other === key) continue;
    const r = el.getBoundingClientRect();
    const ahead =
      dx > 0
        ? r.left >= from.right - 4
        : dx < 0
          ? r.right <= from.left + 4
          : dy > 0
            ? r.top >= from.bottom - 4
            : r.bottom <= from.top + 4;
    if (!ahead) continue;
    const ox = r.left + r.width / 2 - cx;
    const oy = r.top + r.height / 2 - cy;
    const score =
      ox * dx + oy * dy + (Math.abs(ox * dy) + Math.abs(oy * dx)) * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = other;
    }
  }
  return best;
}

function keyMove(key: string, dir: [number, number]) {
  const { home, homeGeo: g, homePage, setHome } = useOS.getState();
  let target = neighbour(key, dir);
  // Past the page's edge: onto the next (or previous) page
  if (!target && dir[0] && home.grid.includes(key)) {
    const { placed } = paginate(home.grid, g.cols, g.rows);
    const page = placed.filter((p) => p.page === homePage + dir[0]);
    target = (dir[0] > 0 ? page[0] : page.at(-1))?.key ?? null;
  }
  if (!target) return announce(`${labelOf(key)} can't move further that way.`);
  const list = listOf(home, target)!;
  if (list === "dock" && isWidget(key))
    return announce("Widgets stay on the Home Screen.");
  if (
    list === "dock" &&
    !home.dock.includes(key) &&
    home.dock.length >= DOCK_MAX
  )
    return announce("The dock is full. Move an app out of it first.");
  const entries = home[list];
  const without = entries.filter((k) => k !== key);
  const from = entries.indexOf(key);
  const index =
    from >= 0 && from < entries.indexOf(target)
      ? without.indexOf(target) + 1
      : without.indexOf(target);
  setHome(place(home, key, list, index));
  announce(`${labelOf(key)}: ${whereIs(key)}.`);
  refocus(key);
}

function keyFolder(key: string) {
  const { home } = useOS.getState();
  if (isWidget(key) || isFolder(key))
    return announce("Only apps go in folders.");
  const list = home[listOf(home, key) ?? "grid"];
  const at = list.indexOf(key);
  const target = [list[at + 1], list[at - 1]].find((k) => k && !isWidget(k));
  if (!target)
    return announce(
      `There's no app next to ${labelOf(key)} to make a folder with.`,
    );
  makeFolder(key, target);
}

function useKeyboard() {
  const wiggle = useOS((s) => s.wiggle);
  useEffect(() => {
    const screen = document.querySelector<HTMLElement>("[data-screen]");
    if (!wiggle || !screen) return;
    const onKey = (e: KeyboardEvent) => {
      if (useOS.getState().homeSheet || e.ctrlKey || e.metaKey || e.altKey)
        return;
      const target = e.target as Element;
      const el = target.closest<HTMLElement>(
        "[data-home-key], [data-dock-key]",
      );
      if (!el || target.closest("[data-edit-ui]")) return;
      const key = (el.dataset.homeKey ?? el.dataset.dockKey)!;
      const dir = ARROWS[e.key];
      if (dir) keyMove(key, dir);
      else if (e.key === "Delete" || e.key === "Backspace") requestRemove(key);
      else if (e.key === "f" || e.key === "F") keyFolder(key);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    screen.addEventListener("keydown", onKey);
    return () => screen.removeEventListener("keydown", onKey);
  }, [wiggle]);
}

/* ───────────── Menus and sheets (over everything on the screen) ───────────── */

/** Focus goes in (to `[data-autofocus]` or the first control), Tab stays inside, and focus returns after. */
function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const before = document.activeElement as HTMLElement | null;
    const controls = () =>
      [
        ...root.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input",
        ),
      ].filter((el) => el.tabIndex >= 0);
    (
      root.querySelector<HTMLElement>("[data-autofocus]") ?? controls()[0]
    )?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = controls();
      const at = list.indexOf(document.activeElement as HTMLElement);
      const next =
        list[(at + (e.shiftKey ? -1 : 1) + list.length) % list.length];
      if (next) {
        e.preventDefault();
        next.focus();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("keydown", onKey);
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, [ref]);
}

const close = () => useOS.getState().setHomeSheet(null);

function Scrim({ label }: { label: string }) {
  return (
    <m.button
      type="button"
      tabIndex={-1}
      aria-label={label}
      onClick={close}
      className="absolute inset-0 bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2, ease: easeOut } }}
      exit={{ opacity: 0, transition: { duration: 0.16, ease: easeOut } }}
    />
  );
}

/** A sheet that rises from the bottom (a plain fade with reduced motion). */
function Sheet({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & Record<
  `aria-${string}` | "role",
  string
>) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  return (
    <m.div
      ref={ref}
      aria-modal="true"
      {...rest}
      className={`absolute inset-x-[2.5cqw] bottom-[max(10px,env(safe-area-inset-bottom))] max-h-[88%] ${className ?? ""}`}
      initial={{ y: "105%", opacity: 0.6 }}
      animate={{ y: 0, opacity: 1, transition: springs.smooth }}
      exit={{
        y: "105%",
        opacity: 0,
        transition: { duration: 0.22, ease: easeOut },
      }}
    >
      {children}
    </m.div>
  );
}

const SHEET_GROUP =
  "overflow-hidden rounded-[18px] bg-app-group/95 text-app-ink shadow-[0_10px_40px_rgb(0_0_0/0.35)]";
/* Alerts: one card, radius 34, padding 14, gap 10; title in
   Headline, message in Footnote; 48 pt capsule buttons, none filled, the destructive one in red. */
const ALERT =
  "flex flex-col gap-[10px] rounded-ios-alert bg-app-group/95 p-[14px] text-app-ink shadow-[0_10px_40px_rgb(0_0_0/0.35)]";
const ALERT_BUTTON =
  "block h-12 w-full rounded-full px-4 text-center text-[17px] font-medium transition-colors duration-150 outline-none";
const ALERT_PLAIN = `${ALERT_BUTTON} bg-ios-fill-tertiary active:bg-ios-fill-secondary focus-visible:bg-ios-fill-secondary`;
const ALERT_DESTRUCTIVE = `${ALERT_BUTTON} bg-ios-destructive-bg text-ios-red active:bg-ios-fill-secondary focus-visible:bg-ios-fill-secondary`;

function MenuItem({
  children,
  onSelect,
  destructive,
  disabled,
  note,
}: {
  children: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onSelect()}
      className={`flex w-full flex-col items-start px-4 py-[11px] text-left text-[16px] transition-colors duration-150 outline-none focus-visible:bg-app-divider/50 active:bg-app-divider/50 ${destructive ? "text-ios-red" : ""} ${disabled ? "opacity-45" : ""}`}
    >
      {children}
      {note && <span className="text-[12.5px] text-app-muted">{note}</span>}
    </button>
  );
}

/** Long-press menu on an icon (right-click, or the menu key / Shift+F10 on a focused one). */
function EntryMenu({ entry }: { entry: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // The icon is on screen as the menu opens: where it is, once
  const [box] = useState(() => {
    const el = entryEl(entry);
    if (!el) return null;
    const f = screenFrame();
    return { ...f.rect(el), W: f.W, H: f.H };
  });
  const geo = useOS((s) => s.homeGeo);
  useFocusTrap(ref);

  const item = TILES[entry];
  const app = !isWidget(entry) && !isFolder(entry);
  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  const width = Math.min(250, (box?.W ?? 390) - 24);
  const below = box ? box.y + box.h / 2 < box.H * 0.55 : true;
  const menuStyle: CSSProperties = box
    ? {
        width,
        left: Math.max(
          12,
          Math.min(box.W - 12 - width, box.x + box.w / 2 - width / 2),
        ),
        ...(below
          ? { top: box.y + box.h + 10 }
          : { bottom: box.H - box.y + 10 }),
      }
    : { visibility: "hidden" };
  const inDock = useOS.getState().home.dock.includes(entry);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    const items = [
      ...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []),
    ];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const to = {
      ArrowDown: at + 1,
      ArrowUp: at - 1,
      Home: 0,
      End: items.length - 1,
    }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    items[(to + items.length) % items.length]?.focus();
  };

  return (
    <m.div
      key="menu"
      className="absolute inset-0 z-[58]"
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
    >
      <Scrim label="Close menu" />
      {box && (
        // The icon lifts above the dimmed screen, like the real thing
        <div
          aria-hidden
          inert
          className="pointer-events-none absolute flex justify-center *:w-full"
          style={
            {
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
              "--icon": `${geo.icon}px`,
            } as CSSProperties
          }
        >
          <HomeEntry entry={entry} showLabel={!inDock && !isWidget(entry)} />
        </div>
      )}
      <m.div
        ref={ref}
        role="menu"
        aria-label={`${labelOf(entry)} actions`}
        onKeyDown={onKeyDown}
        className={`absolute divide-y divide-app-divider ${SHEET_GROUP}`}
        style={{ ...menuStyle, transformOrigin: below ? "50% 0" : "50% 100%" }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1, transition: springs.snappy }}
        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.14 } }}
      >
        {!isWidget(entry) && (
          <MenuItem onSelect={run(() => openEntry(entry))}>
            {isFolder(entry)
              ? "Open Folder"
              : item?.href
                ? `Open ${item.label}`
                : "Open"}
          </MenuItem>
        )}
        {app && item && (
          <MenuItem onSelect={run(() => void shareEntry(entry))}>
            Share…
          </MenuItem>
        )}
        <MenuItem
          onSelect={run(() => {
            haptic();
            useOS.getState().setWiggle(true);
          })}
        >
          Edit Home Screen
        </MenuItem>
        {!isWidget(entry) && (
          <MenuItem
            destructive
            disabled={entry === PINNED}
            note={
              entry === PINNED
                ? "Settings always stays, so nothing gets lost"
                : undefined
            }
            onSelect={() =>
              useOS.getState().setHomeSheet({ kind: "remove", key: entry })
            }
          >
            {isFolder(entry) ? "Remove Folder" : "Remove App"}
          </MenuItem>
        )}
      </m.div>
    </m.div>
  );
}

/** "Remove “Blog”?" — it goes to the App Library, from where + brings it back. */
function RemoveSheet({ entry, folder }: { entry: string; folder?: string }) {
  const label = labelOf(entry);
  const folderApps = isFolder(entry)
    ? (useOS.getState().home.folders[folderId(entry)]?.items.length ?? 0)
    : 0;
  const remove = () => {
    const { home, setHome } = useOS.getState();
    // Focus lands on whatever now sits where the icon was (or Done)
    const list = folder ? null : listOf(home, entry);
    const neighbourKey = list
      ? (home[list][home[list].indexOf(entry) + 1] ??
        home[list][home[list].indexOf(entry) - 1])
      : null;
    let layout: HomeLayout;
    if (folder) {
      const f = home.folders[folder];
      layout = {
        ...home,
        folders: {
          ...home.folders,
          [folder]: { ...f, items: f.items.filter((t) => t !== entry) },
        },
      };
    } else layout = removeEntry(home, entry);
    setHome(layout);
    close();
    announce(
      isFolder(entry)
        ? `Removed the ${label} folder. Its apps are in the App Library.`
        : `Removed ${label}. It's in the App Library.`,
    );
    // A folder down to one app dissolves; if it was open, it closes
    if (folder && !useOS.getState().home.folders[folder]) goBack();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // Only if focus went down with the icon (not if the visitor has already moved on)
        const active = document.activeElement;
        if (active && active !== document.body && !active.closest("[role=alertdialog]")) return;
        (
          (neighbourKey &&
            entryEl(neighbourKey)?.querySelector<HTMLElement>("[data-nav]")) ||
          document.querySelector<HTMLElement>("[data-edit-done]")
        )?.focus({
          preventScroll: true,
        });
      }),
    );
  };
  return (
    <div key="remove" className="absolute inset-0 z-[58]">
      <Scrim label="Cancel" />
      <Sheet
        role="alertdialog"
        aria-labelledby="remove-title"
        aria-describedby="remove-message"
        className={ALERT}
      >
          <div className="px-2 pt-1.5 text-center">
            <p
              id="remove-title"
              className="text-ios-headline font-semibold"
            >
              {isFolder(entry)
                ? `Remove the “${label}” folder?`
                : `Remove “${label}”?`}
            </p>
            <p
              id="remove-message"
              className="mt-0.5 text-ios-footnote text-app-secondary"
            >
              {isFolder(entry)
                ? `Its ${folderApps} apps move to the App Library.`
                : "It moves to the App Library. Add it back any time with + in edit mode, or in Settings → Home Screen."}
            </p>
          </div>
          <button
            type="button"
            data-autofocus
            onClick={remove}
            className={ALERT_DESTRUCTIVE}
          >
            {isFolder(entry)
              ? "Remove Folder"
              : folder
                ? "Remove from Folder"
                : "Remove from Home Screen"}
          </button>
          <button
            type="button"
            onClick={close}
            className={ALERT_PLAIN}
          >
            Cancel
          </button>
      </Sheet>
    </div>
  );
}

function ResetSheet() {
  const reset = () => {
    useOS.getState().setHome(defaultLayout());
    close();
    announce("The Home Screen is back to how it started.");
  };
  return (
    <div key="reset" className="absolute inset-0 z-[58]">
      <Scrim label="Cancel" />
      <Sheet
        role="alertdialog"
        aria-labelledby="reset-title"
        aria-describedby="reset-message"
        className={ALERT}
      >
          <div className="px-2 pt-1.5 text-center">
            <p
              id="reset-title"
              className="text-ios-headline font-semibold"
            >
              Reset Home Screen?
            </p>
            <p id="reset-message" className="mt-0.5 text-ios-footnote text-app-secondary">
              Every app, folder and widget goes back to where it started.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className={ALERT_DESTRUCTIVE}
          >
            Reset Home Screen
          </button>
          <button
            type="button"
            data-autofocus
            onClick={close}
            className={ALERT_PLAIN}
          >
            Cancel
          </button>
      </Sheet>
    </div>
  );
}

/** Every app and link: the ones not on the Home Screen can be added back; any of them opens. */
function AppLibrary() {
  const home = useOS((s) => s.home);
  const hidden = hiddenTiles(home);
  const all = Object.keys(TILES).sort((a, b) =>
    TILES[a].label.localeCompare(TILES[b].label),
  );
  const add = (id: string) => {
    const { home: current, homeGeo: g, setHome } = useOS.getState();
    setHome(addToHome(current, id, g.cols, g.rows));
    announce(`Added ${TILES[id].label} to the Home Screen: ${whereIs(id)}.`);
  };
  return (
    <div key="library" className="absolute inset-0 z-[58]">
      <Scrim label="Close App Library" />
      <Sheet
        role="dialog"
        aria-label="App Library"
        className={`flex flex-col ${SHEET_GROUP}`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-[22px] font-bold tracking-tight">App Library</h2>
          <button
            type="button"
            onClick={close}
            className="rounded-full px-2 py-1 text-[17px] font-semibold text-ios-label-link"
          >
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 [--icon:min(54px,13cqw)]">
          <h3 className="mt-1 text-ios-headline font-semibold text-app-muted">
            Not on the Home Screen
          </h3>
          {hidden.length ? (
            <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-4">
              {hidden.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-library-add={id}
                  aria-label={`Add ${TILES[id].label} to the Home Screen`}
                  onClick={() => add(id)}
                  className="relative flex flex-col items-center gap-1.5 rounded-[14px] outline-offset-2"
                >
                  <IconFace item={TILES[id]} tileKey={null} />
                  <span className="max-w-full truncate text-[11.5px]">
                    {TILES[id].label}
                  </span>
                  <span
                    aria-hidden
                    className="absolute top-[-5px] right-[calc(50%-var(--icon)/2-7px)] grid size-[20px] place-items-center rounded-full bg-[#34c759] text-white shadow"
                  >
                    <svg
                      viewBox="0 0 12 12"
                      className="size-[10px]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M6 1.5v9M1.5 6h9" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[14px] text-app-muted">
              Everything is on your Home Screen.
            </p>
          )}

          <h3 className="mt-6 text-ios-headline font-semibold text-app-muted">
            All apps
          </h3>
          <ul className="mt-1 divide-y divide-app-divider">
            {all.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    const item = TILES[id];
                    if (item.href)
                      window.open(item.href, "_blank", "noopener,noreferrer");
                    else if (item.app) openApp(item.app);
                  }}
                  className="flex w-full items-center gap-3 py-2 text-left [--icon:32px]"
                >
                  <IconFace item={TILES[id]} tileKey={null} />
                  <span className="flex-1 text-ios-body">
                    {TILES[id].label}
                  </span>
                  <span className="text-[12.5px] text-app-muted">
                    {TILES[id].href ? "Link" : "App"}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => useOS.getState().setHomeSheet({ kind: "reset" })}
            className="mt-5 h-12 w-full rounded-full bg-ios-destructive-bg text-[17px] font-medium text-ios-red"
          >
            Reset Home Screen…
          </button>
        </div>
      </Sheet>
    </div>
  );
}

/* ───────────── The layer itself (mounted by Phone) ───────────── */

export function HomeSheets() {
  const sheet = useOS((s) => s.homeSheet);
  const wiggle = useOS((s) => s.wiggle);
  const icon = useOS((s) => s.homeGeo.icon);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  useDragging(ghostRef, setGhost);
  useKeyboard();

  // What edit mode is, said once as it starts, and when it ends
  const was = useRef(false);
  useEffect(() => {
    if (wiggle)
      announce(
        "Editing the Home Screen. Drag icons to move them, or use the arrow keys. Delete removes the focused app, F puts it in a folder with the next one. Press Done or Escape to finish.",
      );
    else if (was.current) announce("Finished editing the Home Screen.");
    was.current = wiggle;
  }, [wiggle]);

  return (
    <>
      <LiveRegion />
      {ghost && (
        <>
          <style>{`[data-home-key="${ghost.key}"],[data-dock-key="${ghost.key}"],[data-folder-item="${ghost.key}"],[data-badge-for="${ghost.key}"]{opacity:0}`}</style>
          <div
            ref={ghostRef}
            aria-hidden
            inert
            data-drag-ghost={ghost.key}
            className="edit-ghost pointer-events-none absolute top-0 left-0 z-[58] flex justify-center *:w-full"
            style={
              {
                width: ghost.w,
                height: ghost.h,
                transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0)`,
                "--icon": `${icon}px`,
              } as CSSProperties
            }
          >
            <HomeEntry entry={ghost.key} showLabel={false} />
          </div>
        </>
      )}
      <AnimatePresence>
        {sheet?.kind === "menu" && (
          <EntryMenu key={`menu-${sheet.key}`} entry={sheet.key} />
        )}
        {sheet?.kind === "remove" && (
          <RemoveSheet key="remove" entry={sheet.key} folder={sheet.folder} />
        )}
        {sheet?.kind === "library" && <AppLibrary key="library" />}
        {sheet?.kind === "reset" && <ResetSheet key="reset" />}
      </AnimatePresence>
    </>
  );
}
