"use client";

import type { ComponentType } from "react";

import type { AppId } from "@content/schema";
import { lazyComponent, type Lazy } from "@/lib/lazy";

/**
 * While an app's code loads (only when it's opened in the first moments after page load): the
 * shape of an app screen, so the launch lands on something that reads as the app drawing in.
 */
function Loading() {
  return (
    <div aria-hidden className="absolute inset-0 bg-app-background px-4 pt-[max(env(safe-area-inset-top),12px)] tab:pt-[7cqh]">
      <div className="h-[38px]">
        <span className="block size-[34px] rounded-full bg-app-group" />
      </div>
      <span className="mt-3 block h-[34px] w-[46%] rounded-[10px] bg-app-group" />
      <span className="mt-2 block h-[14px] w-[64%] rounded-full bg-app-group" />
      <span className="mt-6 block aspect-[16/10] rounded-[18px] bg-app-group" />
      <span className="mt-5 block h-[120px] rounded-[14px] bg-app-group" />
    </div>
  );
}

const app = (load: () => Promise<{ default: ComponentType }>) => lazyComponent(() => load().then((mod) => mod.default), Loading, "lazy-arrive");

/**
 * Every app is its own chunk; only the home screen ships in the initial bundle. The chunks are
 * fetched once the page is idle (and again on the first touch), so a launch renders the app in
 * its first frame instead of waiting on the network.
 */
export const APPS: Partial<Record<AppId, Lazy<object>>> = {
  courses: app(() => import("./courses")),
  journey: app(() => import("./journey")),
  expertise: app(() => import("./expertise")),
  platforms: app(() => import("./platforms")),
  projects: app(() => import("./projects")),
  blog: app(() => import("./blog")),
  reviews: app(() => import("./reviews")),
  services: app(() => import("./services")),
  contact: app(() => import("./contact")),
  settings: app(() => import("./settings")),
  ask: app(() => import("./ask")),
};

/** Fetch an app's chunk ahead of its launch. */
export function preloadApp(id: AppId) {
  void APPS[id]?.preload();
}

/** Fetch every app's chunk. */
export function preloadApps() {
  (Object.keys(APPS) as AppId[]).forEach(preloadApp);
}
