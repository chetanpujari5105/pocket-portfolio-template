"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useMotionValueEvent, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useDrag, type FullGestureState } from "@use-gesture/react";
import { Accessibility, ALargeSmall, Moon, Play, Sun, SunDim } from "lucide-react";

import { profile } from "@content/profile";
import { FINISH_INFO, useSetFinish } from "@/components/studio/FinishSwatches";
import { useTheme } from "@/components/ui/theme-toggle";
import { onRadioGroupKeyDown } from "@/lib/a11y";
import { releaseVelocity } from "@/lib/gesture";
import { haptic, panelProgress, rubberBand } from "@/lib/motion";
import { settlePanel } from "@/lib/panel";
import { useOS, WALLPAPERS } from "@/lib/store";
import { FINISHES, setThemeWithReveal } from "@/lib/theme";
import { cnMerge as cn } from "@/lib/cn-merge";

import { BrandTile } from "./BrandIcon";
import { youtube } from "./brand-marks";
import { useServerData } from "./server-data";

/** How far a pull from the top-right corner travels to open the panel fully (fraction of screen). */
const PULL = 0.42;

const WALLPAPER_SWATCH: Record<(typeof WALLPAPERS)[number], string> = {
  ribbons: "radial-gradient(70% 50% at 30% 35%, var(--accent), transparent 70%), linear-gradient(180deg,#1a1205,#000)",
  aurora: "radial-gradient(80% 50% at 50% 25%, #3fe0b0, transparent 70%), linear-gradient(180deg,#041a1a,#020509)",
  dusk: "radial-gradient(90% 60% at 50% 100%, var(--accent), transparent 70%), linear-gradient(180deg,#2a1640,#c0587a 70%,#f2a65a)",
};

function Tile({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("cc-tile rounded-[22px] p-3 text-white", className)} style={style}>
      {children}
    </div>
  );
}

function Toggle({
  on,
  label,
  icon,
  onToggle,
}: {
  on: boolean;
  label: string;
  icon: ReactNode;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        haptic();
        onToggle();
      }}
      className="press-spring flex aspect-square flex-col justify-between rounded-[22px] p-3 text-left"
      data-on={on || undefined}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-9 place-items-center rounded-full transition-colors duration-200",
          on ? "bg-white text-black" : "bg-white/15 text-white",
        )}
      >
        {icon}
      </span>
      <span className="text-[12px] leading-tight font-semibold text-white">
        {label}
        <span className="block font-medium text-white/60">{on ? "On" : "Off"}</span>
      </span>
    </button>
  );
}

/**
 * Control Center: pull down from the top-right corner of the screen (or tap the battery), swipe up
 * / Esc / tap outside to close. Appearance, finish, wallpaper, motion and text size, brightness, and
 * what's playing on the channel.
 */
export function ControlPanel() {
  const open = useOS((s) => s.panelOpen);
  const reduceMotion = useOS((s) => s.reduceMotion);
  const largeText = useOS((s) => s.largeText);
  const finish = useOS((s) => s.finish);
  const wallpaper = useOS((s) => s.wallpaper);
  const brightness = useOS((s) => s.brightness);
  const theme = useTheme();
  const setFinish = useSetFinish();
  const { video } = useServerData();
  const layerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const shown = useRef(false);

  const backdrop = panelProgress;
  const y = useTransform(panelProgress, (p) => (1 - Math.min(1, p)) * -48 + Math.max(0, p - 1) * 40);
  const scale = useTransform(panelProgress, [0, 1], [0.94, 1]);
  const opacity = useTransform(panelProgress, [0, 0.55], [0, 1]);
  const blur = useTransform(panelProgress, [0, 1], ["blur(0px)", "blur(18px)"]);

  // Mounted while visible at all, so the layer never blocks the screen when closed
  useMotionValueEvent(panelProgress, "change", (p) => {
    const visible = p > 0.001;
    if (visible === shown.current) return;
    shown.current = visible;
    layerRef.current?.toggleAttribute("data-visible", visible);
  });

  // Focus moves into the panel when it opens and back to the handle when it closes
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  }, [open]);

  /* Pull down from the corner: the panel follows the finger, then settles with the release velocity. */
  const H = () => layerRef.current?.clientHeight ?? 800;
  const drag = (s: FullGestureState<"drag">) => {
    const { tap, last, first, memo } = s;
    const my = s.movement[1];
    if (tap) {
      settlePanel(!useOS.getState().panelOpen);
      return;
    }
    const base = (memo as number | undefined) ?? panelProgress.get();
    if (first) panelProgress.stop();
    const raw = base + my / (H() * PULL);
    // Past fully open it stretches a little; above closed it stays closed
    panelProgress.set(raw > 1 ? 1 + rubberBand(raw - 1, 1) * 0.5 : Math.max(0, raw));
    if (last) {
      const v = releaseVelocity(s, 1) / (H() * PULL);
      const p = panelProgress.get();
      if (p > 0.5 ? v > -1.2 : v > 1.2) {
        if (!useOS.getState().panelOpen) haptic();
        settlePanel(true, v);
      } else settlePanel(false, v);
    }
    return base;
  };
  useDrag(drag, { target: handleRef, axis: "y", filterTaps: true, threshold: 4, pointer: { capture: true } });
  useDrag(
    (s) => {
      // Swipe up anywhere on the open panel to put it away (controls still take taps and slider drags)
      if (s.tap) return;
      if (s.first && (s.event.target as Element).closest("input")) return s.cancel();
      return drag(s);
    },
    { target: layerRef, axis: "y", filterTaps: true, threshold: 8, enabled: open, pointer: { capture: false } },
  );

  const isDark = theme === "dark";
  const nowPlaying = video
    ? { title: video.title, by: "Latest on YouTube", href: video.url }
    : { title: profile.youtubeLine, by: "YouTube channel", href: profile.youtube };

  return (
    <>
      <button
        ref={handleRef}
        type="button"
        data-panel-handle
        aria-label="Control Center"
        aria-expanded={open}
        className="absolute top-0 right-0 z-[76] h-[max(env(safe-area-inset-top),12px)] w-[42%] cursor-pointer touch-none tab:h-[6.2cqh]"
      />
      <div ref={layerRef} data-control-panel className="cc-layer absolute inset-0 z-[75] touch-none">
        <m.button
          type="button"
          tabIndex={-1}
          aria-label="Close Control Center"
          onClick={() => settlePanel(false)}
          style={{ opacity: backdrop, backdropFilter: blur, WebkitBackdropFilter: blur }}
          className="absolute inset-0 bg-black/30"
        />
        <m.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Control Center"
          inert={!open}
          style={{ y, scale, opacity, transformOrigin: "85% 0%" }}
          className="relative mx-[5.5cqw] mt-[max(env(safe-area-inset-top),9cqh)] grid grid-cols-4 gap-[3cqw] tab:mt-[9cqh] land:mx-auto land:mt-[max(env(safe-area-inset-top),14px)] land:w-[min(calc(100%-48px),760px)] land:grid-flow-row-dense land:grid-cols-8 land:gap-[10px]"
        >
          <Tile className="col-span-2 row-span-2 flex flex-col p-0">
            <Toggle
              on={isDark}
              label="Dark mode"
              icon={isDark ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
              onToggle={() => {
                const r = handleRef.current?.getBoundingClientRect();
                setThemeWithReveal(isDark ? "light" : "dark", { x: r ? r.left + r.width / 2 : 0, y: r ? r.top : 0 });
              }}
            />
          </Tile>
          <Tile className="p-0">
            <Toggle
              on={reduceMotion}
              label="Reduce motion"
              icon={<Accessibility className="size-[18px]" />}
              onToggle={() => useOS.getState().setReduceMotion(!reduceMotion)}
            />
          </Tile>
          <Tile className="p-0">
            <Toggle
              on={largeText}
              label="Larger text"
              icon={<ALargeSmall className="size-[18px]" />}
              onToggle={() => useOS.getState().setLargeText(!largeText)}
            />
          </Tile>
          <Tile className="col-span-2 flex flex-col justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wide text-white/65 uppercase">Finish</span>
            <div role="radiogroup" aria-label="Phone finish" onKeyDown={onRadioGroupKeyDown} className="flex justify-between">
              {FINISHES.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={finish === f}
                  tabIndex={finish === f ? 0 : -1}
                  aria-label={FINISH_INFO[f].label}
                  onClick={() => setFinish(f)}
                  className={cn(
                    "press-spring size-8 rounded-full",
                    finish === f ? "shadow-[0_0_0_2px_rgb(0_0_0/0.5),0_0_0_4px_#fff]" : "shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)]",
                  )}
                  style={{ background: `linear-gradient(150deg, ${FINISH_INFO[f].color}, ${FINISH_INFO[f].deep})` }}
                />
              ))}
            </div>
          </Tile>
          <Tile className="col-span-4 flex items-center gap-3">
            <SunDim aria-hidden className="size-5 shrink-0" />
            <label className="sr-only" htmlFor="cc-brightness">
              Brightness
            </label>
            <input
              id="cc-brightness"
              type="range"
              min={40}
              max={100}
              value={Math.round(brightness * 100)}
              onChange={(e) => useOS.getState().setBrightness(Number(e.target.value) / 100)}
              className="cc-slider h-9 min-w-0 flex-1"
              style={{ "--fill": `${((brightness - 0.4) / 0.6) * 100}%` } as CSSProperties}
            />
            <Sun aria-hidden className="size-5 shrink-0" />
          </Tile>
          <Tile className="col-span-2 flex flex-col justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wide text-white/65 uppercase">Wallpaper</span>
            <div role="radiogroup" aria-label="Wallpaper" onKeyDown={onRadioGroupKeyDown} className="flex justify-between">
              {WALLPAPERS.map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={wallpaper === w}
                  tabIndex={wallpaper === w ? 0 : -1}
                  aria-label={w[0].toUpperCase() + w.slice(1)}
                  onClick={() => useOS.getState().setWallpaper(w)}
                  className={cn(
                    "press-spring h-10 w-7 rounded-[7px]",
                    wallpaper === w ? "shadow-[0_0_0_2px_rgb(0_0_0/0.5),0_0_0_4px_#fff]" : "shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)]",
                  )}
                  style={{ background: WALLPAPER_SWATCH[w] }}
                />
              ))}
            </div>
          </Tile>
          <Tile className="col-span-2 flex flex-col justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <BrandTile mark={youtube} className="size-[18px]" />
              <span className="text-[11px] font-semibold tracking-wide text-white/65 uppercase">Now playing</span>
            </span>
            <span className="line-clamp-2 text-[13px] leading-snug font-semibold">{nowPlaying.title}</span>
            <span className="flex items-center justify-between">
              <span className="truncate text-[11.5px] text-white/65">{nowPlaying.by}</span>
              <a
                href={nowPlaying.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Play ${nowPlaying.title} on YouTube (opens in a new tab)`}
                className="press-spring grid size-8 shrink-0 place-items-center rounded-full bg-white text-black"
              >
                <Play className="size-4 fill-current" aria-hidden />
              </a>
            </span>
          </Tile>
        </m.div>
      </div>
    </>
  );
}
