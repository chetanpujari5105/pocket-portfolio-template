"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { useMotionValueEvent, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useDrag, type FullGestureState } from "@use-gesture/react";

import { profile } from "@content/profile";
import { FINISH_INFO, useSetFinish } from "@/components/studio/FinishSwatches";
import { useTheme } from "@/components/ui/theme-toggle";
import { onRadioGroupKeyDown } from "@/lib/a11y";
import { releaseVelocity } from "@/lib/gesture";
import { setLaunchOrigin } from "@/lib/launch";
import { haptic, panelProgress, rubberBand, springs } from "@/lib/motion";
import { settlePanel } from "@/lib/panel";
import { openApp } from "@/lib/router";
import { prefersReducedMotion, useOS, WALLPAPERS } from "@/lib/store";
import { FINISHES, setThemeWithReveal } from "@/lib/theme";
import { cnMerge as cn } from "@/lib/cn-merge";

import { useServerData } from "./server-data";

/*
 * Control Center: a 4-column grid of 68 pt units with 15 pt gutters (318 pt on a 402 pt
 * screen), scaled to the screen. Modules are glass with these radii: 2×2 tiles 30, toggles
 * and sliders full pills. Every control does something real on this site; there are no stand-in
 * radios. The glyphs are our own, drawn on a 24 grid.
 */

/** How far a pull from the top-right corner travels to open the panel fully (fraction of screen). */
const PULL = 0.42;

const WALLPAPER_INFO: Record<(typeof WALLPAPERS)[number], { label: string; swatch: string }> = {
  ribbons: {
    label: "Ribbons",
    swatch: "radial-gradient(70% 50% at 30% 35%, var(--accent), transparent 70%), linear-gradient(180deg,#1a1205,#000)",
  },
  aurora: {
    label: "Aurora",
    swatch: "radial-gradient(80% 50% at 50% 25%, #3fe0b0, transparent 70%), linear-gradient(180deg,#041a1a,#020509)",
  },
  dusk: {
    label: "Dusk",
    swatch: "radial-gradient(90% 60% at 50% 100%, var(--accent), transparent 70%), linear-gradient(180deg,#2a1640,#c0587a 70%,#f2a65a)",
  },
};

/* ───────────────────────── Glyphs ───────────────────────── */

const GLYPH: Record<string, ReactNode> = {
  moon: <path d="M15.6 3.6a8.6 8.6 0 1 0 4.8 13.1A7.2 7.2 0 0 1 15.6 3.6Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5.1 5.1l1.8 1.8M17.1 17.1l1.8 1.8M5.1 18.9l1.8-1.8M17.1 6.9l1.8-1.8" fill="none" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  motion: (
    <>
      <circle cx="14.5" cy="12" r="6" />
      <path d="M3 8.2h3.2M2 12h3.4M3 15.8h3.2" fill="none" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  text: (
    <>
      <path d="M2.4 19 7.5 5.2h1.8L14.4 19h-2.3l-1.3-3.7H6l-1.3 3.7Zm4.3-5.6h3.5L8.4 8.2Z" />
      <path d="M15.2 19 18.3 10.6h1.5L22.9 19h-1.9l-.7-2.1h-2.9l-.7 2.1Zm3-3.6h2l-1-3Z" />
    </>
  ),
  torch: <path d="M7.5 2.8h9v3l-2 3.4v11a1.6 1.6 0 0 1-1.6 1.6h-1.8a1.6 1.6 0 0 1-1.6-1.6v-11l-2-3.4Zm4.5 9.1a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z" fillRule="evenodd" />,
  finish: (
    <>
      <path d="M7.6 2.5h8.8a2.6 2.6 0 0 1 2.6 2.6v13.8a2.6 2.6 0 0 1-2.6 2.6H7.6A2.6 2.6 0 0 1 5 18.9V5.1a2.6 2.6 0 0 1 2.6-2.6Zm0 1.8a.8.8 0 0 0-.8.8v13.8c0 .4.4.8.8.8h8.8c.4 0 .8-.4.8-.8V5.1a.8.8 0 0 0-.8-.8Z" fillRule="evenodd" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  wallpaper: (
    <path
      fillRule="evenodd"
      d="M5.6 3.5h12.8a2.6 2.6 0 0 1 2.6 2.6v11.8a2.6 2.6 0 0 1-2.6 2.6H5.6A2.6 2.6 0 0 1 3 17.9V6.1a2.6 2.6 0 0 1 2.6-2.6Zm0 1.8a.8.8 0 0 0-.8.8v9.6l4.1-4.4c.5-.5 1.2-.5 1.7 0l2.6 2.8 1.6-1.6c.5-.5 1.2-.5 1.7 0l2.7 2.8V6.1a.8.8 0 0 0-.8-.8Zm10.6 2.1a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z"
    />
  ),
  mail: <path fillRule="evenodd" d="M4.6 5h14.8A2.6 2.6 0 0 1 22 7.6v8.8a2.6 2.6 0 0 1-2.6 2.6H4.6A2.6 2.6 0 0 1 2 16.4V7.6A2.6 2.6 0 0 1 4.6 5Zm.3 2 7.1 5.3L19.1 7Zm15.3 1.4-7.7 5.7a.9.9 0 0 1-1 0L3.8 8.4v8c0 .4.4.8.8.8h14.8c.4 0 .8-.4.8-.8Z" />,
  play: <path d="M7.5 4.6c0-.9 1-1.5 1.8-1l11 6.9c.7.5.7 1.5 0 2l-11 6.9c-.8.5-1.8-.1-1.8-1Z" />,
  check: <path d="m5 12.4 4.4 4.4L19 7.2" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
};

function Glyph({ name, className }: { name: keyof typeof GLYPH; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("cc-glyph", className)} fill="currentColor" stroke="currentColor" strokeWidth="0">
      {GLYPH[name]}
    </svg>
  );
}

/* ───────────────────────── Controls ───────────────────────── */

/** A round toggle: a glass well when off, white with a dark glyph when on (the system on-fill). */
function RoundToggle({ on, label, glyph, onToggle, className }: { on: boolean; label: string; glyph: keyof typeof GLYPH; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      data-on={on || undefined}
      onClick={() => {
        haptic();
        onToggle();
      }}
      className={cn("cc-round press-spring", className)}
    >
      <Glyph name={glyph} />
    </button>
  );
}

/**
 * A tall pill slider (a 1×2 slider): it fills from the bottom with white (dark in light
 * mode) and its glyph sits at the foot. Dragging moves it from where it was, like iOS, not to the
 * finger; `steps` makes it snap. Arrow keys, Page Up/Down, Home and End work too.
 */
function PillSlider({
  label,
  glyph,
  value,
  min,
  max,
  steps,
  valueText,
  onChange,
  style,
}: {
  label: string;
  glyph: keyof typeof GLYPH;
  value: number;
  min: number;
  max: number;
  steps?: number;
  valueText: (v: number) => string;
  onChange: (v: number) => void;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<number | null>(null);
  const shown = live ?? value;
  const span = max - min;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const snap = (v: number) => (steps ? min + Math.round(((v - min) / span) * (steps - 1)) * (span / (steps - 1)) : v);

  useDrag(
    ({ first, last, movement: [, my], memo }) => {
      const start = (memo as number | undefined) ?? value;
      const h = ref.current?.offsetHeight || 150;
      // Screen px per layout px, for the scaled and 3D phones
      const k = (ref.current?.getBoundingClientRect().height || h) / h;
      const raw = start - (my / k / h) * span;
      const v = raw > max ? max + rubberBand(raw - max, span) * 0.15 : raw < min ? min - rubberBand(min - raw, span) * 0.15 : raw;
      if (first) haptic(4);
      if (last) {
        setLive(null);
        const settled = snap(clamp(v));
        if (settled !== value) haptic();
        onChange(settled);
        return start;
      }
      setLive(v);
      if (!steps) onChange(clamp(v));
      return start;
    },
    // Keys are onKeyDown's: use-gesture's own keyboard drag would undo a stepped arrow press
    { target: ref, axis: "y", filterTaps: true, pointer: { capture: true, keys: false } },
  );

  const step = steps ? span / (steps - 1) : span / 20;
  const onKeyDown = (e: KeyboardEvent) => {
    const next =
      e.key === "ArrowUp" || e.key === "ArrowRight" ? value + step
      : e.key === "ArrowDown" || e.key === "ArrowLeft" ? value - step
      : e.key === "PageUp" ? value + step * 3
      : e.key === "PageDown" ? value - step * 3
      : e.key === "Home" ? min
      : e.key === "End" ? max
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(snap(clamp(next)));
  };

  const fill = Math.min(1.06, Math.max(-0.04, (shown - min) / span));
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 100) / 100}
      aria-valuetext={valueText(value)}
      onKeyDown={onKeyDown}
      data-cc-slider
      className="cc-module cc-pill cc-slider touch-none"
      style={style}
    >
      <span aria-hidden className="cc-slider-fill" style={{ height: `${Math.max(0, fill) * 100}%`, transform: fill > 1 ? `scaleY(${fill})` : undefined }} />
      <Glyph name={glyph} className="cc-slider-glyph" />
    </div>
  );
}

/** A glass menu that grows from its button: the four finishes, or the three wallpapers. */
function GlassMenu<T extends string>({
  label,
  options,
  value,
  onPick,
  onClose,
}: {
  label: string;
  options: readonly { value: T; label: string; swatch: string; round?: boolean }[];
  value: T;
  onPick: (v: T) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-checked=true]")?.focus({ preventScroll: true });
  }, []);
  const reduce = prefersReducedMotion();
  return (
    <m.div
      ref={ref}
      role="dialog"
      aria-label={label}
      data-cc-menu
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={reduce ? { duration: 0.15 } : springs.snappy}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        // Esc closes the menu, not Control Center
        e.stopPropagation();
        onClose();
      }}
      className="cc-menu"
    >
      <p className="cc-menu-title">{label}</p>
      <div role="radiogroup" aria-label={label} onKeyDown={onRadioGroupKeyDown}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            tabIndex={value === o.value ? 0 : -1}
            onClick={() => {
              haptic();
              onPick(o.value);
              onClose();
            }}
            className="cc-menu-row press-spring"
          >
            <span aria-hidden className={cn("cc-menu-swatch", o.round && "rounded-full")} style={{ background: o.swatch }} />
            <span className="flex-1 text-left">{o.label}</span>
            {value === o.value && <Glyph name="check" className="size-[1.05em]" />}
          </button>
        ))}
      </div>
    </m.div>
  );
}

/* ───────────────────────── The panel ───────────────────────── */

/**
 * Control Center: pull down from the top-right corner of the screen (or tap the battery), swipe up
 * / Esc / tap outside to close. Appearance, reduce motion, larger text and the flashlight; what's
 * new on the channel; finish and wallpaper menus; brightness and text size; and a way to write.
 */
export function ControlPanel() {
  const open = useOS((s) => s.panelOpen);
  const reduceMotion = useOS((s) => s.reduceMotion);
  const largeText = useOS((s) => s.largeText);
  const finish = useOS((s) => s.finish);
  const wallpaper = useOS((s) => s.wallpaper);
  const brightness = useOS((s) => s.brightness);
  const torch = useOS((s) => s.torch);
  const theme = useTheme();
  const setFinish = useSetFinish();
  const { video } = useServerData();
  const [menu, setMenu] = useState<null | "finish" | "wallpaper">(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const shown = useRef(false);

  const backdrop = panelProgress;
  // It drops from the top-right corner: down from above, growing from that corner
  const y = useTransform(panelProgress, (p) => (1 - Math.min(1, p)) * -48 + Math.max(0, p - 1) * 40);
  const scale = useTransform(panelProgress, [0, 1], [0.9, 1]);
  const opacity = useTransform(panelProgress, [0, 0.55], [0, 1]);
  const blur = useTransform(panelProgress, [0, 1], ["blur(0px) saturate(100%)", "blur(30px) saturate(150%)"]);

  // Mounted while visible at all, so the layer never blocks the screen when closed
  useMotionValueEvent(panelProgress, "change", (p) => {
    const visible = p > 0.001;
    if (visible === shown.current) return;
    shown.current = visible;
    layerRef.current?.toggleAttribute("data-visible", visible);
  });

  // Focus moves into the panel when it opens and back to the handle when it closes; a menu
  // never outlives the panel
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setMenu(null);
  }
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  }, [open]);

  const closeMenu = (which: "finish" | "wallpaper") => {
    setMenu(null);
    panelRef.current?.querySelector<HTMLElement>(`[data-cc-trigger=${which}]`)?.focus({ preventScroll: true });
  };

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
  useDrag(drag, { target: handleRef, axis: "y", filterTaps: true, threshold: 4, pointer: { capture: true, keys: false } });
  useDrag(
    (s) => {
      // Swipe up anywhere on the open panel to put it away (sliders and menus keep their own drags)
      if (s.tap) return;
      if (s.first && (s.event.target as Element).closest("[data-cc-slider], [data-cc-menu]")) return s.cancel();
      return drag(s);
    },
    { target: layerRef, axis: "y", filterTaps: true, threshold: 8, enabled: open, pointer: { capture: false, keys: false } },
  );

  const isDark = theme === "dark";
  const nowPlaying = video
    ? { title: video.title, by: "Latest on YouTube", href: video.url, thumb: video.thumb }
    : { title: profile.youtubeLine, by: "YouTube channel", href: profile.youtube, thumb: null };

  const openContact = () => {
    const el = panelRef.current?.querySelector<HTMLElement>("[data-cc-contact]");
    if (el) setLaunchOrigin("contact", el);
    settlePanel(false);
    openApp("contact");
  };

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
          onClick={() => (menu ? setMenu(null) : settlePanel(false))}
          style={{ opacity: backdrop, backdropFilter: blur, WebkitBackdropFilter: blur }}
          className="cc-backdrop absolute inset-0"
        />
        <m.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Control Center"
          inert={!open}
          style={{ y, scale, opacity, transformOrigin: "88% 0%" }}
          onClick={(e) => {
            // A tap between the modules puts an open menu away
            if (menu && e.target === e.currentTarget) setMenu(null);
          }}
          className="cc-grid relative"
        >
          {/* 2×2: appearance, motion, text and the flashlight */}
          <div role="group" aria-label="Display" className="cc-module cc-tile cc-cluster" style={{ gridArea: "cluster" }}>
            <RoundToggle
              on={isDark}
              label="Dark mode"
              glyph="moon"
              onToggle={() => {
                const r = handleRef.current?.getBoundingClientRect();
                setThemeWithReveal(isDark ? "light" : "dark", { x: r ? r.left + r.width / 2 : 0, y: r ? r.top : 0 });
              }}
            />
            <RoundToggle on={reduceMotion} label="Reduce motion" glyph="motion" onToggle={() => useOS.getState().setReduceMotion(!reduceMotion)} />
            <RoundToggle on={largeText} label="Larger text" glyph="text" onToggle={() => useOS.getState().setLargeText(!largeText)} />
            <RoundToggle on={torch} label="Flashlight" glyph="torch" onToggle={() => useOS.getState().setTorch(!torch)} />
          </div>

          {/* 2×2: Now Playing, the channel's latest video */}
          <a
            href={nowPlaying.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Now playing: ${nowPlaying.title}. Watch on YouTube (opens in a new tab)`}
            className="cc-module cc-tile cc-now press-spring"
            style={{ gridArea: "np" }}
          >
            <span className="flex items-start justify-between">
              <span aria-hidden className="cc-art">
                {nowPlaying.thumb && (
                  // The channel's own thumbnail, straight from YouTube
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={nowPlaying.thumb} alt="" className="size-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                )}
              </span>
              <span aria-hidden className="cc-play">
                <Glyph name="play" />
              </span>
            </span>
            <span className="mt-auto block min-w-0">
              <span className="cc-label line-clamp-2">{nowPlaying.title}</span>
              <span className="cc-detail block truncate">{nowPlaying.by}</span>
            </span>
          </a>

          {/* Round buttons that open a glass menu */}
          <button
            type="button"
            data-cc-trigger="finish"
            aria-label={`Finish: ${FINISH_INFO[finish].label}`}
            aria-haspopup="dialog"
            aria-expanded={menu === "finish"}
            onClick={() => {
              haptic();
              setMenu(menu === "finish" ? null : "finish");
            }}
            className="cc-module cc-round-module press-spring"
            style={{ gridArea: "finish" }}
          >
            <Glyph name="finish" />
            <span aria-hidden className="cc-dot" style={{ background: FINISH_INFO[finish].color }} />
          </button>
          <button
            type="button"
            data-cc-trigger="wallpaper"
            aria-label={`Wallpaper: ${WALLPAPER_INFO[wallpaper].label}`}
            aria-haspopup="dialog"
            aria-expanded={menu === "wallpaper"}
            onClick={() => {
              haptic();
              setMenu(menu === "wallpaper" ? null : "wallpaper");
            }}
            className="cc-module cc-round-module press-spring"
            style={{ gridArea: "wallpaper" }}
          >
            <Glyph name="wallpaper" />
          </button>

          {/* 2×1: write to the owner */}
          <button type="button" data-cc-contact onClick={openContact} className="cc-module cc-pill cc-wide press-spring" style={{ gridArea: "contact" }}>
            <span aria-hidden className="cc-well">
              <Glyph name="mail" />
            </span>
            <span className="min-w-0 text-left">
              <span className="cc-label block">Contact</span>
              <span className="cc-detail block truncate">Send a note</span>
            </span>
          </button>

          {/* 1×2 sliders */}
          <PillSlider
            label="Brightness"
            glyph="sun"
            value={brightness}
            min={0.4}
            max={1}
            valueText={(v) => `${Math.round(((v - 0.4) / 0.6) * 100)}%`}
            onChange={(v) => useOS.getState().setBrightness(Math.round(v * 100) / 100)}
            style={{ gridArea: "bright" }}
          />
          <PillSlider
            label="Text size"
            glyph="text"
            value={largeText ? 1 : 0}
            min={0}
            max={1}
            steps={2}
            valueText={(v) => (v >= 0.5 ? "Larger" : "Default")}
            onChange={(v) => useOS.getState().setLargeText(v >= 0.5)}
            style={{ gridArea: "text" }}
          />

          {menu === "finish" && (
            <GlassMenu
              label="Finish"
              value={finish}
              options={FINISHES.map((f) => ({
                value: f,
                label: FINISH_INFO[f].label,
                swatch: `linear-gradient(150deg, ${FINISH_INFO[f].color}, ${FINISH_INFO[f].deep})`,
                round: true,
              }))}
              onPick={setFinish}
              onClose={() => closeMenu("finish")}
            />
          )}
          {menu === "wallpaper" && (
            <GlassMenu
              label="Wallpaper"
              value={wallpaper}
              options={WALLPAPERS.map((w) => ({ value: w, label: WALLPAPER_INFO[w].label, swatch: WALLPAPER_INFO[w].swatch }))}
              onPick={(w) => useOS.getState().setWallpaper(w)}
              onClose={() => closeMenu("wallpaper")}
            />
          )}
        </m.div>
      </div>
    </>
  );
}
