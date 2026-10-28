"use client";

import { useEffect } from "react";

import { appsLayout } from "@content/apps";
import { profile } from "@content/profile";
import type { AppId } from "@content/schema";
import { useOS, type Route } from "@/lib/store";

export const ENABLE_ASK = process.env.NEXT_PUBLIC_ENABLE_ASK === "true";

const APP_IDS = Object.keys(appsLayout.titles) as AppId[];
export const HOME_TITLE = profile.site.title;

export function isAppId(value: string): value is AppId {
  return (APP_IDS as string[]).includes(value) && (value !== "ask" || ENABLE_ASK);
}

/** "#courses/your-first-course" → { app: "courses", sub: "your-first-course" } */
export function parseHash(hash: string): Omit<Route, "initial"> {
  const [app = "", ...rest] = hash.replace(/^#/, "").split("/");
  if (!isAppId(app)) return { app: null, sub: null };
  const sub = rest.join("/");
  return { app, sub: sub ? decodeURIComponent(sub) : null };
}

function toHash(app: AppId | null, sub: string | null) {
  if (!app) return "#home";
  return sub ? `#${app}/${encodeURIComponent(sub)}` : `#${app}`;
}

/** Entries we pushed carry how many of our entries sit above the page's own entry. */
type HistoryMark = { pp: true; depth: number };
const isOurEntry = (state: unknown): state is HistoryMark =>
  typeof state === "object" && state !== null && (state as HistoryMark).pp === true;
const depthOf = (state: unknown) => (isOurEntry(state) ? state.depth : 0);

/** Set while history.go(-n) is in flight for goHome(). */
let pendingHome = false;

/** Open an app (or a detail view inside one). Pushes a history entry so Back closes it. */
export function openApp(app: AppId, sub: string | null = null) {
  const { route, setRoute, setSpotlightOpen, setWiggle } = useOS.getState();
  setSpotlightOpen(false);
  setWiggle(false);
  if (route.app === app && route.sub === sub) return;
  const push = (hash: string) =>
    history.pushState({ pp: true, depth: depthOf(history.state) + 1 } satisfies HistoryMark, "", hash);

  if (route.app && route.app !== app && !route.sub) {
    // Switching apps (side nav, Spotlight, cross-links): replace, so Back still lands on home.
    history.replaceState(history.state, "", toHash(app, null));
    if (sub) push(toHash(app, sub));
  } else if (sub && route.app !== app) {
    // Deep entry from outside the app: Back should land on the app's list first.
    push(toHash(app, null));
    push(toHash(app, sub));
  } else {
    push(toHash(app, sub));
  }
  setRoute({ app, sub, initial: false });
}

/**
 * Back chevron / Esc / swipe: pop the detail view, else close the app. Uses the
 * browser's own history when we pushed the entry, so Back and our UI never disagree.
 */
export function goBack() {
  const { route, setRoute } = useOS.getState();
  if (!route.app) return;
  if (isOurEntry(history.state)) {
    history.back();
    return;
  }
  // Deep-linked entry: nothing of ours to pop, so replace in place.
  const next = route.sub ? { app: route.app, sub: null } : { app: null, sub: null };
  history.replaceState(null, "", toHash(next.app, next.sub));
  setRoute({ ...next, initial: false });
}

/** Close everything (swipe up on the home indicator) and return to the home screen. */
export function goHome() {
  const { route, setRoute } = useOS.getState();
  if (!route.app) return;
  const depth = depthOf(history.state);
  if (depth > 0) {
    pendingHome = true;
    history.go(-depth);
    return;
  }
  history.replaceState(null, "", "#home");
  setRoute({ app: null, sub: null, initial: false });
}

/** Keeps the store in sync with the URL hash and document.title. Mount once. */
export function useHashRouter() {
  const route = useOS((s) => s.route);

  useEffect(() => {
    const { setRoute } = useOS.getState();
    setRoute({ ...parseHash(location.hash), initial: true });
    // Reveal the home screen only after the deep-linked window has painted.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.documentElement.removeAttribute("data-deeplink")),
    );

    const sync = () => {
      const parsed = parseHash(location.hash);
      if (pendingHome) {
        pendingHome = false;
        // Landed on a deep-linked app entry: the page's own entry becomes home.
        if (parsed.app) history.replaceState(null, "", "#home");
        setRoute({ app: null, sub: null, initial: false });
        return;
      }
      setRoute({ ...parsed, initial: false });
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  useEffect(() => {
    document.title =
      route.app && route.app !== "socials"
        ? `${appsLayout.titles[route.app]} · ${profile.name}`
        : route.app === "socials"
          ? `Socials · ${profile.name}`
          : HOME_TITLE;
  }, [route.app]);
}
