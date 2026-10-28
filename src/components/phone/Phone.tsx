"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { LazyMotion, MotionConfig } from "motion/react";
import { Rotate3d } from "lucide-react";

import { appsLayout } from "@content/apps";
import type { AppId } from "@content/schema";
import { BrightnessDim as BrightnessDimLayer } from "@/components/os/BrightnessDim";
import { HomeScreen } from "@/components/os/HomeScreen";
import { LockScreen as LockScreenLayer } from "@/components/os/LockScreen";
import { StatusPill } from "@/components/os/StatusPill";
import { lazyComponent, whenIdle } from "@/lib/lazy";
import { settlePanel } from "@/lib/panel";
import { folderOf, goBack, goHome, useHashRouter } from "@/lib/router";
import { useOS } from "@/lib/store";
import { SCREEN_INSET_RATIO } from "@/lib/device";
import { setAppBackground } from "@/lib/theme-color";
import { STAGE_3D_QUERY, STAGE_INTENT } from "@/lib/theme";

import type { Phone3DProps, Rig } from "./Phone3D";
import { StatusBar as StatusBarLayer } from "./StatusBar";
import { Wallpaper as WallpaperLayer } from "./Wallpaper";

/** `next`: switching apps — this one closes quickly, then `next` launches from its icon. */
type WindowState = { app: AppId; closing: boolean; initial: boolean; next?: AppId };

const Phone3D = dynamic<Phone3DProps>(() => import("./Phone3D"), { ssr: false });

// `m` components render and follow motion values straight away; animation/layout features arrive async
const loadMotionFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

// Layers that start closed load right after hydration instead of in the first bundle. The app
// window (with the app registry) is fetched straight after hydration too, and never suspends
// once it is here.
const AppWindow = lazyComponent(() => import("@/components/os/AppWindow").then((m) => m.AppWindow));
const loadRegistry = () => import("@/components/apps/registry");
const preloadApps = () => void loadRegistry().then((m) => m.preloadApps());
const preloadApp = (app: string) => void loadRegistry().then((m) => m.preloadApp(app as AppId));
const AppSwitcher = memo(dynamic(() => import("@/components/os/AppSwitcher").then((m) => m.AppSwitcher), { ssr: false }));
const Spotlight = memo(dynamic(() => import("@/components/os/Spotlight").then((m) => m.Spotlight), { ssr: false }));
const FolderView = memo(dynamic(() => import("@/components/os/FolderView").then((m) => m.FolderView), { ssr: false }));
const ControlPanel = memo(dynamic(() => import("@/components/os/ControlPanel").then((m) => m.ControlPanel), { ssr: false }));
const NotificationBanner = memo(dynamic(() => import("@/components/os/NotificationBanner").then((m) => m.NotificationBanner), {
  ssr: false,
}));
// Phone re-renders on every route change; the layers whose props don't change skip it, so a
// launch only renders the home screen and the window
const BrightnessDim = memo(BrightnessDimLayer);
const LockScreen = memo(LockScreenLayer);
const StatusBar = memo(StatusBarLayer);
const Wallpaper = memo(WallpaperLayer);
// Home-screen editing: menus, sheets, the App Library and drag-and-drop (one chunk with the edit overlay)
const HomeSheets = lazyComponent(() => import("@/components/os/HomeEditor").then((m) => m.HomeSheets));
const loadRig = () => import("./Phone3D").then((m) => m.newRig());

/** How long the CSS phone waits for the 3D phone to make the entrance. */
const STAGE_WAIT_MS = 900;
/** CSS phone arrival length (globals.css `phone-arrive`) — the screen wakes just after. */
const CSS_ARRIVAL_MS = 900;

let webgl: boolean | undefined;
function hasWebGL() {
  if (webgl === undefined) {
    try {
      webgl = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

function subscribe3D(onChange: () => void) {
  const mq = window.matchMedia(STAGE_3D_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** 3D phone by default on desktop with WebGL, unless the visitor asked for less motion. */
function useCan3D() {
  const reduceMotion = useOS((s) => s.reduceMotion);
  const media = useSyncExternalStore(
    subscribe3D,
    () => window.matchMedia(STAGE_3D_QUERY).matches && hasWebGL(),
    () => false,
  );
  return media && !reduceMotion;
}

const wake = () => document.documentElement.setAttribute("data-awake", "");

export function Phone() {
  useHashRouter();
  const route = useOS((s) => s.route);
  // Once editing has started the sheets layer stays mounted (it holds the screen-reader announcements)
  const editing = useOS((s) => s.wiggle || !!s.homeSheet);
  const [editorUsed, setEditorUsed] = useState(false);
  if (editing && !editorUsed) setEditorUsed(true);
  const reduceMotion = useOS((s) => s.reduceMotion);
  const screenRef = useRef<HTMLDivElement>(null);
  const bezelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [win, setWin] = useState<WindowState | null>(null);
  const can3D = useCan3D();
  const [failed3D, setFailed3D] = useState(false);
  const [rig, setRig] = useState<Rig | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Pick<Phone3DProps, "hostSize" | "offset"> | null>(null);
  const use3D = can3D && !failed3D;

  useEffect(() => {
    useOS.getState().hydratePrefs();
    // Every app's code is on the device before the first tap: fetched once the page is quiet
    // (within 1.5 s), or the moment a finger lands, whichever comes first.
    void AppWindow.preload();
    // The service worker (sw/sw.ts): production builds only, once the first load has settled
    const cancelWorker =
      process.env.NODE_ENV === "production" && "serviceWorker" in navigator
        ? whenIdle(() => void import("@/lib/sw-register").then((mod) => mod.registerWorker()), 4000)
        : () => {};
    const cancel = whenIdle(preloadApps, 1500);
    const now = () => {
      cancel();
      preloadApps();
    };
    const opts = { capture: true, once: true, passive: true } as const;
    window.addEventListener("pointerdown", now, opts);
    window.addEventListener("touchstart", now, opts);
    return () => {
      cancel();
      cancelWorker();
      window.removeEventListener("pointerdown", now, opts);
      window.removeEventListener("touchstart", now, opts);
    };
  }, []);

  // The 3D stage loads on the visitor's first sign of life (pointer, wheel, key or touch), once the
  // main thread is idle. Its WebGL setup is one long task, so it never runs during first load.
  // Early intent gets the 3D entrance; later intent swaps the 3D phone in place.
  useEffect(() => {
    if (!use3D || rig) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    let id = 0;
    const load = () => {
      stop();
      id = idle(() => void loadRig().then(setRig), { timeout: 600 });
    };
    const stop = () => STAGE_INTENT.forEach((type) => window.removeEventListener(type, load));
    if (document.documentElement.hasAttribute("data-intent")) load();
    else STAGE_INTENT.forEach((type) => window.addEventListener(type, load, { passive: true }));
    return () => {
      stop();
      cancel(id);
    };
  }, [use3D, rig]);

  // The CSS phone waits briefly so the 3D phone can arrive; otherwise it arrives itself.
  useEffect(() => {
    const root = document.documentElement;
    const started = performance.now();
    const release = window.setTimeout(
      () => {
        if (!root.hasAttribute("data-stage-wait")) return;
        root.removeAttribute("data-stage-wait");
        window.setTimeout(wake, CSS_ARRIVAL_MS + 150);
      },
      use3D ? STAGE_WAIT_MS : 0,
    );
    // CSS-only path (tablet/phone/no WebGL): wake after its arrival
    if (!root.hasAttribute("data-stage-wait"))
      window.setTimeout(wake, Math.max(0, CSS_ARRIVAL_MS + 150 - started));
    return () => window.clearTimeout(release);
    // Only on mount: later 3D changes swap without an entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Size the 3D screen exactly like the CSS screen, so the swap is pixel-aligned.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    const bezel = bezelRef.current;
    if (!use3D || !wrap || !stage || !bezel) return;
    const measure = () => {
      const phonePx = wrap.offsetHeight;
      const inset = phonePx * SCREEN_INSET_RATIO;
      const w = Math.round(wrap.offsetWidth - inset * 2);
      const h = Math.round(phonePx - inset * 2);
      // Centre of the CSS phone relative to the stage centre (ignores the arrival transform)
      let x = 0;
      let y = 0;
      for (let el: HTMLElement | null = wrap; el && el !== stage.offsetParent; el = el.offsetParent as HTMLElement | null) {
        x += el.offsetLeft;
        y += el.offsetTop;
      }
      const cx = x + wrap.offsetWidth / 2 - (stage.offsetLeft + stage.offsetWidth / 2);
      const cy = y + phonePx / 2 - (stage.offsetTop + stage.offsetHeight / 2);
      setLayout((prev) =>
        prev && prev.hostSize.w === w && prev.hostSize.h === h && prev.offset.x === cx && prev.offset.y === cy
          ? prev
          : { hostSize: { w, h, phonePx }, offset: { x: cx, y: cy } },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [use3D]);

  // Move the live screen (not a copy, nothing remounts) into the 3D host, and back on fallback.
  const live3D = use3D && !!host && !!rig;
  useLayoutEffect(() => {
    const screen = screenRef.current;
    const target = live3D ? host : bezelRef.current;
    if (!screen || !target || screen.parentElement === target) return;
    target.appendChild(screen);
    const root = document.documentElement;
    root.toggleAttribute("data-3d", live3D);
    if (live3D) {
      const waiting = root.hasAttribute("data-stage-wait");
      root.removeAttribute("data-stage-wait");
      if (!waiting) {
        // Late swap (CSS phone already arrived): appear in place, no second entrance.
        if (stageRef.current) stageRef.current.style.opacity = "1";
        wake();
      }
    }
  }, [live3D, host]);

  const onError = useCallback(() => setFailed3D(true), []);
  const onLanded = useCallback(() => window.setTimeout(wake, 150), []);

  // Route → window lifecycle (keeps the window mounted while it animates closed).
  // Adjusted during render when the routed app changes, per React's "storing info from previous renders".
  const windowApp = route.app && route.app !== "socials" ? route.app : null;
  const [prevApp, setPrevApp] = useState<AppId | null>(null);
  if (windowApp !== prevApp) {
    setPrevApp(windowApp);
    setWin((prev) => {
      if (windowApp) {
        if (prev?.app === windowApp) return { ...prev, closing: false, next: undefined };
        // Another app is up: out to home first, then into the new icon (never a cut).
        if (prev && !route.initial) return { ...prev, closing: true, next: windowApp };
        return { app: windowApp, closing: false, initial: route.initial };
      }
      return prev ? { ...prev, closing: true, next: undefined } : null;
    });
  }

  // The browser bar blends into the open app, else the wallpaper (lib/theme-color.ts).
  const appUp = !!win && !win.closing;
  useEffect(() => {
    // Read in the next frame, after its own style pass: reading styles right after a launch or a
    // theme switch would force that restyle into the same task
    let raf = 0;
    const color = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setAppBackground(appUp ? getComputedStyle(document.documentElement).getPropertyValue("--app-background").trim() : null),
      );
    };
    color();
    // Theme changes swap the app background
    const observer = new MutationObserver(color);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [appUp]);

  // Esc closes the top-most layer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const { spotlightOpen, setSpotlightOpen, wiggle, setWiggle, route, switcherOpen, setSwitcherOpen, panelOpen, homeSheet, setHomeSheet } =
        useOS.getState();
      if (homeSheet) setHomeSheet(null);
      else if (panelOpen) {
        settlePanel(false);
        document.querySelector<HTMLElement>("[data-panel-handle]")?.focus({ preventScroll: true });
      } else if (switcherOpen) setSwitcherOpen(false);
      else if (spotlightOpen) setSpotlightOpen(false);
      // A folder open in edit mode closes first; then edit mode ends
      else if (wiggle && route.app !== "socials") setWiggle(false);
      else if (route.app) goBack();
      else return;
      e.preventDefault();
    };
    // Ctrl+↑: app switcher (like a swipe-and-hold on the home indicator)
    const onSwitcherKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.key !== "ArrowUp") return;
      e.preventDefault();
      const { setSwitcherOpen, switcherOpen, route } = useOS.getState();
      if (switcherOpen) return setSwitcherOpen(false);
      setSwitcherOpen(true);
      if (route.app) goHome();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onSwitcherKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onSwitcherKey);
    };
  }, []);

  // Warm app chunks when the visitor points at an icon.
  const warm = (e: { target: EventTarget }) => {
    const app = (e.target as HTMLElement).closest<HTMLElement>("[data-app-icon]")?.dataset.appIcon;
    if (app) preloadApp(app);
  };

  return (
    <LazyMotion features={loadMotionFeatures} strict>
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      {use3D && (
        <div ref={stageRef} data-stage className="stage" onPointerOver={warm} onFocus={warm}>
          {rig && layout && (
            <Phone3D
              stage={stageRef}
              rig={rig}
              hostSize={layout.hostSize}
              offset={layout.offset}
              onHost={setHost}
              onLanded={onLanded}
              onError={onError}
            />
          )}
        </div>
      )}
      {live3D && rig && (
        <button
          type="button"
          onClick={() => rig.flip()}
          aria-label="Flip the phone"
          className="absolute bottom-7 left-7 z-10 inline-flex h-9 items-center gap-2 rounded-full border border-studio-line px-3.5 text-[13px] font-semibold text-studio-muted transition-colors duration-150 hover:text-studio-ink"
        >
          <Rotate3d aria-hidden className="size-4" strokeWidth={2} />
          Flip
        </button>
      )}
      <CssPhone wrapRef={wrapRef} bezelRef={bezelRef} onPointerOver={warm} onFocus={warm}>
        <div ref={screenRef} data-screen className="phone-screen">
          <Wallpaper />
          <HomeScreen open={!!win && !win.closing && !win.next} />
          {win && (
            <AppWindow
              key={win.app}
              app={win.app}
              title={appsLayout.titles[win.app]}
              closing={win.closing}
              initial={win.initial}
              quick={!!win.next}
              screenRef={screenRef}
              onClosed={() => {
                const app = win.app;
                if (win.next) {
                  setWin({ app: win.next, closing: false, initial: false });
                  return;
                }
                setWin(null);
                screenRef.current
                  ?.querySelector<HTMLElement>(`[data-app-icon="${app}"]`)
                  ?.focus({ preventScroll: true });
              }}
            />
          )}
          <LockScreen />
          <FolderView id={folderOf(route)} screenRef={screenRef} />
          {editorUsed && <HomeSheets />}
          <Spotlight />
          <AppSwitcher screenRef={screenRef} />
          <StatusBar onApp={!!win && !win.closing} />
          <NotificationBanner screenRef={screenRef} />
          <ControlPanel />
          <StatusPill />
          <BrightnessDim />
          <div className="screen-off" aria-hidden />
        </div>
      </CssPhone>
    </MotionConfig>
    </LazyMotion>
  );
}

function CssPhone({
  children,
  wrapRef,
  bezelRef,
  onPointerOver,
  onFocus,
}: {
  children: ReactNode;
  wrapRef: React.RefObject<HTMLDivElement | null>;
  bezelRef: React.RefObject<HTMLDivElement | null>;
  onPointerOver?: (e: { target: EventTarget }) => void;
  onFocus?: (e: { target: EventTarget }) => void;
}) {
  return (
    <div ref={wrapRef} className="phone-wrap" onPointerOver={onPointerOver} onFocus={onFocus}>
      <div className="phone-rim">
        {/* The screen is the bezel's only child; <Phone> may move it into the 3D host. */}
        <div ref={bezelRef} className="phone-bezel">
          {children}
        </div>
      </div>
      {/* Action, volume up/down; side button and the flush camera control */}
      <span aria-hidden className="phone-btn top-[15.2%] -left-[2px] h-[3.6%]" />
      <span aria-hidden className="phone-btn top-[21.6%] -left-[2px] h-[5.8%]" />
      <span aria-hidden className="phone-btn top-[28.6%] -left-[2px] h-[5.8%]" />
      <span aria-hidden className="phone-btn top-[22.5%] -right-[2px] h-[9%]" />
      <span aria-hidden className="phone-btn phone-btn-flush top-[56%] -right-px h-[5%]" />
    </div>
  );
}
