"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type { AppId } from "@content/schema";

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


/** Every app is its own chunk; only the home screen ships in the initial bundle. */
export const APPS: Partial<Record<AppId, ComponentType>> = {
  courses: dynamic(() => import("./courses"), { loading: Loading }),
  journey: dynamic(() => import("./journey"), { loading: Loading }),
  expertise: dynamic(() => import("./expertise"), { loading: Loading }),
  platforms: dynamic(() => import("./platforms"), { loading: Loading }),
  projects: dynamic(() => import("./projects"), { loading: Loading }),
  blog: dynamic(() => import("./blog"), { loading: Loading }),
  reviews: dynamic(() => import("./reviews"), { loading: Loading }),
  services: dynamic(() => import("./services"), { loading: Loading }),
  contact: dynamic(() => import("./contact"), { loading: Loading }),
  settings: dynamic(() => import("./settings"), { loading: Loading }),
  ask: dynamic(() => import("./ask"), { loading: Loading }),
};

/** Warm an app's chunk on hover/focus so the launch never waits on the network. */
export function preloadApp(app: AppId) {
  const loaders: Partial<Record<AppId, () => Promise<unknown>>> = {
    courses: () => import("./courses"),
    journey: () => import("./journey"),
    expertise: () => import("./expertise"),
    platforms: () => import("./platforms"),
    projects: () => import("./projects"),
    blog: () => import("./blog"),
    reviews: () => import("./reviews"),
    services: () => import("./services"),
    contact: () => import("./contact"),
    settings: () => import("./settings"),
  };
  void loaders[app]?.();
}
