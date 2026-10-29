import { create } from "zustand";

import type { AppId } from "@content/schema";
import { defaultLayout, homeGeometry, readHome, sanitize, writeHome, type HomeGeometry, type HomeLayout } from "@/lib/home";
import { FINISHES, readStored, writeStored, type Finish } from "@/lib/theme";

export type Wallpaper = "ribbons" | "aurora" | "dusk";
export const WALLPAPERS: readonly Wallpaper[] = ["ribbons", "aurora", "dusk"];

export type Route = {
  app: AppId | null;
  /** Pushed detail view inside the app, e.g. a course id */
  sub: string | null;
  /** True for the route read on page load (deep link): open without animation */
  initial: boolean;
};

/** Short-lived message shown by the status pill (morphs out of the camera cutout). */
export type PillIcon = "check" | "moon" | "sun" | "link";
export type PillEvent = { kind: "done" | "info" | "progress"; text: string; id: number; icon?: PillIcon };

/** Home-screen editing overlays (all drawn by the lazily loaded editor). */
export type HomeSheet =
  | { kind: "menu"; key: string }
  | { kind: "remove"; key: string; folder?: string }
  | { kind: "library" }
  | { kind: "reset" };

type OSState = {
  route: Route;
  finish: Finish;
  wallpaper: Wallpaper;
  reduceMotion: boolean;
  largeText: boolean;
  spotlightOpen: boolean;
  wiggle: boolean;
  locked: boolean;
  switcherOpen: boolean;
  panelOpen: boolean;
  /** 0.4–1: screen brightness from the control panel */
  brightness: number;
  /** Lock-screen flashlight: a brightness boost over the screen until it's switched off or unlocked */
  torch: boolean;
  homePage: number;
  /** Apps opened this session, most recent first (app switcher) */
  recents: AppId[];
  /** Home screen: grid, dock and folders, saved after every edit (`pp-home-v2`) */
  home: HomeLayout;
  /** Measured grid for the current screen (columns, rows, icon size) */
  homeGeo: HomeGeometry;
  /** While an icon is dragged: the grid and dock as they would be if it were dropped now */
  homePreview: { grid: string[]; dock: string[] } | null;
  homeSheet: HomeSheet | null;
  /** The entry a long-press started on, so the drag can carry on into edit mode */
  editPress: { key: string; x: number; y: number } | null;
  /** A folder just made: it opens with its name field focused */
  renameFolder: string | null;
  pill: PillEvent | null;
  /** Pre-filled subject for the Contact app (a service's "Start a conversation") */
  contactSubject: string;
  setRoute: (route: Route) => void;
  setFinish: (finish: Finish) => void;
  setWallpaper: (wallpaper: Wallpaper) => void;
  setReduceMotion: (on: boolean) => void;
  setLargeText: (on: boolean) => void;
  setSpotlightOpen: (open: boolean) => void;
  setWiggle: (on: boolean) => void;
  unlock: () => void;
  setSwitcherOpen: (open: boolean) => void;
  setPanelOpen: (open: boolean) => void;
  setBrightness: (value: number) => void;
  setTorch: (on: boolean) => void;
  setHomePage: (page: number) => void;
  forgetRecent: (app: AppId) => void;
  setHome: (layout: HomeLayout) => void;
  setHomeGeo: (geo: HomeGeometry) => void;
  setHomeSheet: (sheet: HomeSheet | null) => void;
  showPill: (kind: PillEvent["kind"], text: string, icon?: PillIcon) => number;
  hidePill: (id?: number) => void;
  setContactSubject: (subject: string) => void;
  hydratePrefs: () => void;
};

export const PREF_KEYS = {
  wallpaper: "pp-wallpaper",
  reduceMotion: "pp-motion",
  largeText: "pp-text",
} as const;

/** Session flag: the lock screen shows once per browser session. */
export const UNLOCK_KEY = "pp-unlocked";

export function readSession(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Blocked storage: the lock screen may show again on reload, which is harmless.
  }
}

let pillSeq = 0;
let pillTimer = 0;

export const useOS = create<OSState>()((set, get) => ({
  route: { app: null, sub: null, initial: true },
  finish: "burgundy",
  wallpaper: "ribbons",
  reduceMotion: false,
  largeText: false,
  spotlightOpen: false,
  wiggle: false,
  // Server render shows the lock screen; CSS hides it for repeat visits until prefs hydrate.
  locked: true,
  switcherOpen: false,
  panelOpen: false,
  brightness: 1,
  torch: false,
  homePage: 0,
  recents: [],
  home: defaultLayout(),
  homeGeo: homeGeometry(390, 844, { top: 0, right: 0, bottom: 0, left: 0 }, false),
  homePreview: null,
  homeSheet: null,
  editPress: null,
  renameFolder: null,
  pill: null,
  contactSubject: "",
  setRoute: (route) =>
    set((s) => ({
      route,
      recents:
        route.app && route.app !== "socials"
          ? [route.app, ...s.recents.filter((a) => a !== route.app)].slice(0, 8)
          : s.recents,
    })),
  setFinish: (finish) => set({ finish }),
  setWallpaper: (wallpaper) => {
    writeStored(PREF_KEYS.wallpaper, wallpaper);
    set({ wallpaper });
  },
  setReduceMotion: (on) => {
    writeStored(PREF_KEYS.reduceMotion, on ? "reduce" : "auto");
    document.documentElement.toggleAttribute("data-reduce-motion", on);
    set({ reduceMotion: on });
  },
  setLargeText: (on) => {
    writeStored(PREF_KEYS.largeText, on ? "large" : "default");
    if (on) document.documentElement.setAttribute("data-text", "large");
    else document.documentElement.removeAttribute("data-text");
    set({ largeText: on });
  },
  setSpotlightOpen: (spotlightOpen) => set({ spotlightOpen }),
  setWiggle: (wiggle) => set(wiggle ? { wiggle } : { wiggle, homePreview: null, editPress: null }),
  unlock: () => {
    writeSession(UNLOCK_KEY, "1");
    document.documentElement.setAttribute("data-unlocked", "");
    set({ locked: false, torch: false });
  },
  setSwitcherOpen: (switcherOpen) => set({ switcherOpen }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setBrightness: (brightness) => set({ brightness: Math.min(1, Math.max(0.4, brightness)) }),
  setTorch: (torch) => set({ torch }),
  setHomePage: (homePage) => set({ homePage }),
  forgetRecent: (app) => set((s) => ({ recents: s.recents.filter((a) => a !== app) })),
  setHome: (layout) => {
    const home = sanitize(layout) ?? defaultLayout();
    writeHome(home);
    set({ home });
  },
  setHomeGeo: (homeGeo) => set({ homeGeo }),
  setHomeSheet: (homeSheet) => set({ homeSheet }),
  showPill: (kind, text, icon) => {
    const id = ++pillSeq;
    window.clearTimeout(pillTimer);
    set({ pill: { kind, text, id, icon } });
    // Progress stays until replaced; messages collapse on their own.
    if (kind !== "progress") pillTimer = window.setTimeout(() => get().hidePill(id), 2600);
    return id;
  },
  hidePill: (id) => {
    if (id === undefined || get().pill?.id === id) set({ pill: null });
  },
  setContactSubject: (contactSubject) => set({ contactSubject }),
  hydratePrefs: () => {
    set({
      finish: readStored("pp-finish", FINISHES) ?? "burgundy",
      wallpaper: readStored(PREF_KEYS.wallpaper, WALLPAPERS) ?? "ribbons",
      reduceMotion: readStored(PREF_KEYS.reduceMotion, ["reduce", "auto"] as const) === "reduce",
      largeText: readStored(PREF_KEYS.largeText, ["large", "default"] as const) === "large",
      locked: !document.documentElement.hasAttribute("data-unlocked") && readSession(UNLOCK_KEY) !== "1",
      home: readHome(),
    });
  },
}));

/** Motion is reduced if the OS asks for it or the visitor toggled it in Settings. */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return (
    useOS.getState().reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
