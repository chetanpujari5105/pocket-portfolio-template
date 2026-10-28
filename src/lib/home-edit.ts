import { profile } from "@content/profile";

import { paginate, TILES, type HomeLayout } from "./home";

/*
 * Home-screen editing helpers, needed only once a visitor starts arranging (they load with the
 * editor, not with the home screen).
 */

/** Folders formed by dropping one app on another take the name of what they share. */
const CATEGORY: Record<string, string> = {
  ...Object.fromEntries(profile.socials.map((s) => [s.id, "Social"])),
  courses: "Learn",
  blog: "Learn",
  platforms: "Learn",
  expertise: "Learn",
  journey: "About Me",
  reviews: "About Me",
  projects: "Work",
  services: "Work",
  contact: "Work",
  ask: "Work",
};

export function folderName(a: string, b: string) {
  const ca = CATEGORY[a];
  return ca && ca === CATEGORY[b] ? ca : "Folder";
}

/** Every tile that isn't on the home screen, in the dock or in a folder (the App Library). */
export function hiddenTiles(layout: HomeLayout) {
  const placed = new Set([...layout.grid, ...layout.dock, ...Object.values(layout.folders).flatMap((f) => f.items)]);
  return Object.keys(TILES).filter((id) => !placed.has(id));
}

/** Index in `grid` where a new 1×1 tile lands in the first free cell (a hole, else the end). */
export function firstFreeIndex(grid: string[], cols: number, rows: number) {
  const { placed } = paginate(grid, cols, rows);
  const taken = new Set(placed.flatMap((p) => {
    const cells: string[] = [];
    for (let y = p.row; y < p.row + p.h; y++) for (let x = p.col; x < p.col + p.w; x++) cells.push(`${p.page}:${y}:${x}`);
    return cells;
  }));
  const lastPage = placed.at(-1)?.page ?? 0;
  for (let page = 0; page <= lastPage; page++)
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (taken.has(`${page}:${r}:${c}`)) continue;
        // The first item after this hole in reading order: insert before it
        const after = placed.findIndex((p) => p.page > page || (p.page === page && (p.row > r || (p.row === r && p.col > c))));
        return after === -1 ? grid.length : after;
      }
  return grid.length;
}

/* ───────────── Edits: each returns a new layout (the store sanitises and saves it) ───────────── */

export type ListName = "grid" | "dock";

export const listOf = (layout: Pick<HomeLayout, "grid" | "dock">, key: string): ListName | null =>
  layout.grid.includes(key) ? "grid" : layout.dock.includes(key) ? "dock" : null;

/** `key` taken out of wherever it is and put into `list` at `index` (counted without it). */
export function place<T extends Pick<HomeLayout, "grid" | "dock">>(layout: T, key: string, list: ListName, index: number): T {
  const grid = layout.grid.filter((k) => k !== key);
  const dock = layout.dock.filter((k) => k !== key);
  const into = list === "grid" ? grid : dock;
  into.splice(Math.max(0, Math.min(index, into.length)), 0, key);
  return { ...layout, grid, dock };
}

/** Without `key` anywhere: the grid, the dock, every folder. A folder key takes the folder with it. */
export function removeEntry(layout: HomeLayout, key: string): HomeLayout {
  const folders = Object.fromEntries(
    Object.entries(layout.folders)
      .filter(([id]) => `f:${id}` !== key)
      .map(([id, f]) => [id, { ...f, items: f.items.filter((t) => t !== key) }]),
  );
  return { ...layout, grid: layout.grid.filter((k) => k !== key), dock: layout.dock.filter((k) => k !== key), folders };
}

/** A tile from the App Library, into the first free cell. */
export function addToHome(layout: HomeLayout, tile: string, cols: number, rows: number): HomeLayout {
  const grid = [...layout.grid];
  grid.splice(firstFreeIndex(grid, cols, rows), 0, tile);
  return { ...layout, grid };
}

/**
 * `tile` dropped on `target`: into the folder if the target is one, otherwise a new folder in the
 * target's place, named for what the two share. Returns the folder's id and whether it is new.
 */
export function mergeInto(layout: HomeLayout, tile: string, target: string) {
  const base = removeEntry(layout, tile);
  if (target.startsWith("f:")) {
    const id = target.slice(2);
    const folder = base.folders[id];
    return { layout: { ...base, folders: { ...base.folders, [id]: { ...folder, items: [...folder.items, tile] } } }, id, created: false };
  }
  let id = `f${Date.now().toString(36)}`;
  while (id in base.folders) id += "x";
  const swap = (list: string[]) => list.map((k) => (k === target ? `f:${id}` : k));
  return {
    layout: {
      ...base,
      grid: swap(base.grid),
      dock: swap(base.dock),
      folders: { ...base.folders, [id]: { name: folderName(target, tile), items: [target, tile] } },
    },
    id,
    created: true,
  };
}

export function arrayMove<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
