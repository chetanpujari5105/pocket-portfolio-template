"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { animate, useMotionValue, useTransform, type MotionValue } from "motion/react";
import * as m from "motion/react-m";
import { useDrag } from "@use-gesture/react";

import { appsLayout, askApp } from "@content/apps";
import type { AppId } from "@content/schema";
import { APPS } from "@/components/apps/registry";
import { setLaunchOrigin } from "@/lib/launch";
import { project, rubberClamp, springs, withVelocity } from "@/lib/motion";
import { openApp } from "@/lib/router";
import { prefersReducedMotion, useOS } from "@/lib/store";

import { FaceGlyph, faceProps } from "./icons";

const ITEMS = [...appsLayout.block, ...appsLayout.row, ...appsLayout.dock, askApp];
const CARD_SCALE = 0.62;

type Layout = { W: number; H: number; spacing: number; radius: number };

/** Recent apps as a carousel of live (inert) cards. Swipe a card up to close it, tap to open. */
export function AppSwitcher({ screenRef }: { screenRef: RefObject<HTMLDivElement | null> }) {
  const open = useOS((s) => s.switcherOpen);
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  return mounted ? <Switcher screenRef={screenRef} open={open} onGone={() => setMounted(false)} /> : null;
}

function Switcher({
  screenRef,
  open,
  onGone,
}: {
  screenRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onGone: () => void;
}) {
  const recents = useOS((s) => s.recents);
  const forgetRecent = useOS((s) => s.forgetRecent);
  const setSwitcherOpen = useOS((s) => s.setSwitcherOpen);
  const [layout, setLayout] = useState<Layout | null>(null);
  const appear = useMotionValue(0);
  const x = useMotionValue(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useRef(prefersReducedMotion());
  const launching = useRef(false);

  useLayoutEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;
    const W = screen.clientWidth;
    const H = screen.clientHeight;
    const radius = (parseFloat(getComputedStyle(screen).borderTopLeftRadius) || 40) * CARD_SCALE + 6;
    setLayout({ W, H, spacing: W * CARD_SCALE + W * 0.07, radius });
  }, [screenRef]);

  // Enter / leave on one spring; leaving unmounts when it lands.
  useEffect(() => {
    if (open) {
      const c = animate(appear, 1, reduce.current ? { duration: 0.18 } : springs.smooth);
      rootRef.current?.querySelector<HTMLElement>("[data-card-open]")?.focus({ preventScroll: true });
      return () => c.stop();
    }
    if (launching.current) {
      onGone();
      return;
    }
    const c = animate(appear, 0, reduce.current ? { duration: 0.15 } : { ...springs.snappy, restDelta: 0.01 });
    c.then(onGone);
    return () => c.stop();
  }, [open, appear, onGone]);

  const close = () => setSwitcherOpen(false);
  const count = recents.length;
  const snapTo = (i: number, velocity = 0) =>
    layout && animate(x, -Math.max(0, Math.min(count - 1, i)) * layout.spacing, withVelocity("smooth", velocity));

  const closeCard = (app: AppId) => {
    forgetRecent(app);
    if (useOS.getState().recents.length === 0) close();
  };

  const launch = (app: AppId, index: number, lift = 0) => {
    if (!layout) return;
    const { W, H } = layout;
    const w = W * CARD_SCALE;
    const h = H * CARD_SCALE;
    const cx = W / 2 + index * layout.spacing + x.get();
    setLaunchOrigin(app, { x: cx - w / 2, y: (H - h) / 2 + lift, w, h, r: layout.radius });
    launching.current = true;
    setSwitcherOpen(false);
    openApp(app);
  };

  // One handler: horizontal drags page the carousel; vertical drags on a card throw it away.
  const cardY = useRef<Record<string, MotionValue<number>>>({});
  const active = useRef<{ app: AppId | null }>({ app: null });
  // Pointer capture retargets the click, so taps are resolved from where the press began.
  const downTarget = useRef<Element | null>(null);
  useDrag(
    (s) => {
      if (!layout) return;
      const { first, last, tap, movement, axis, event, velocity, direction } = s;
      const start = downTarget.current ?? (event.target as Element);
      const target = start.closest<HTMLElement>("[data-card]");
      if (tap) {
        const app = target?.dataset.card as AppId | undefined;
        const index = app ? recents.indexOf(app) : -1;
        if (app && start.closest("[data-card-close]")) closeCard(app);
        else if (app && index >= 0) launch(app, index, cardY.current[app]?.get() ?? 0);
        else close();
        return;
      }
      if (first) active.current.app = (target?.dataset.card as AppId | undefined) ?? null;
      const app = active.current.app;
      if (axis === "y" && app && cardY.current[app]) {
        const y = cardY.current[app];
        y.set(movement[1] > 0 ? rubberClamp(movement[1], 0, 0, 40) : movement[1]);
        if (last) {
          const vy = velocity[1] * direction[1] * 1000;
          if (vy < -600 || movement[1] < -layout.H * CARD_SCALE * 0.35) {
            animate(y, -layout.H, withVelocity("smooth", vy)).then(() => {
              const left = useOS.getState().recents.filter((a) => a !== app);
              forgetRecent(app);
              if (!left.length) close();
              else snapTo(Math.round(-x.get() / layout.spacing));
            });
          } else animate(y, 0, withVelocity("snappy", vy));
        }
        return;
      }
      if (axis === "x") {
        const min = -(count - 1) * layout.spacing;
        const base = s.memo ?? x.get();
        x.set(rubberClamp(base + movement[0], min, 0, layout.W * 0.25));
        if (last) {
          const vx = velocity[0] * direction[0] * 1000;
          snapTo(Math.round(-(x.get() + project(vx, 0.99)) / layout.spacing), vx);
        }
        return base;
      }
    },
    { target: rootRef, axis: "lock", filterTaps: true, threshold: 8, pointer: { capture: true } },
  );

  const backdrop = useTransform(appear, [0, 1], [0, 1]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="App switcher"
      className="absolute inset-0 z-65 touch-none select-none"
      onPointerDownCapture={(e) => (downTarget.current = e.target as Element)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const i = Math.round(-x.get() / (layout?.spacing ?? 1)) + (e.key === "ArrowRight" ? 1 : -1);
          snapTo(i);
          rootRef.current?.querySelectorAll<HTMLElement>("[data-card-open]")[Math.max(0, Math.min(count - 1, i))]?.focus({ preventScroll: true });
        }
      }}
    >
      <m.div
        aria-hidden
        style={{ opacity: backdrop }}
        className="absolute inset-0 bg-black/45 backdrop-blur-[26px]"
      />
      {layout && count === 0 && (
        <m.p style={{ opacity: appear }} className="absolute inset-x-0 top-1/2 text-center text-[15px] font-medium text-white/80">
          No recent apps
        </m.p>
      )}
      {layout &&
        recents.map((app, i) => (
          <Card
            key={app}
            app={app}
            index={i}
            x={x}
            appear={appear}
            layout={layout}
            yRef={(mv) => (cardY.current[app] = mv)}
            onOpen={() => launch(app, i, cardY.current[app]?.get() ?? 0)}
            onClose={() => closeCard(app)}
          />
        ))}
      <button
        type="button"
        data-switcher-home
        onClick={(e) => e.detail === 0 && close()}
        className="glass-dark absolute bottom-[max(env(safe-area-inset-bottom),5cqh)] left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white"
      >
        Home
      </button>
    </div>
  );
}

function Card({
  app,
  index,
  x,
  appear,
  layout,
  yRef,
  onOpen,
  onClose,
}: {
  app: AppId;
  index: number;
  x: MotionValue<number>;
  appear: MotionValue<number>;
  layout: Layout;
  yRef: (y: MotionValue<number>) => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  const y = useMotionValue(0);
  useEffect(() => {
    yRef(y);
  }, [y, yRef]);
  const { W, H, spacing, radius } = layout;
  const item = ITEMS.find((it) => it.app === app);
  const App = APPS[app];
  const title = appsLayout.titles[app];

  // Distance from the centre slot, in cards: side cards shrink a little and darken.
  const offset = useTransform(x, (v) => (index * spacing + v) / spacing);
  const transform = useTransform([offset, y, appear], ([o, dy, a]: number[]) => {
    const scale = CARD_SCALE * (1 - 0.08 * Math.min(Math.abs(o), 2)) * (0.94 + 0.06 * a);
    const tx = W / 2 + o * spacing - (W * scale) / 2;
    const ty = (H - H * scale) / 2 + dy + (1 - a) * 40;
    return `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
  });
  const shade = useTransform(offset, (o) => Math.min(Math.abs(o), 1) * 0.38);
  const opacity = useTransform([appear, y], ([a, dy]: number[]) => a * (1 - Math.min(1, Math.max(0, -dy / H))));

  return (
    <m.div
      data-card={app}
      style={{ transform, opacity, width: W, height: H, transformOrigin: "0 0" } as unknown as CSSProperties}
      className="absolute top-0 left-0"
    >
      {/* Label row above the card (counter-scaled so it stays readable) */}
      <div className="absolute -top-[64px] left-0 flex items-center gap-3 text-white" style={{ fontSize: 30 }}>
        {item && (
          <span
            aria-hidden
            {...faceProps(item)}
            className="tile-face squircle grid size-[58px] place-items-center"
          >
            <FaceGlyph item={item} className="size-[34px]" />
          </span>
        )}
        <span className="font-semibold">{title}</span>
      </div>
      <div
        className="absolute inset-0 overflow-hidden bg-app-background text-app-ink shadow-[0_30px_80px_rgb(0_0_0/0.45)]"
        style={{ borderRadius: radius / CARD_SCALE }}
      >
        <div inert className="pointer-events-none absolute inset-0">
          {App && <App />}
        </div>
        <m.div aria-hidden style={{ opacity: shade }} className="absolute inset-0 bg-black" />
      </div>
      <button
        type="button"
        data-card-open
        aria-label={`Open ${title}`}
        // Pointer taps are handled by the switcher's gesture; this is the keyboard path.
        onClick={(e) => e.detail === 0 && onOpen()}
        onKeyDown={(e) => {
          if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            onClose();
          }
        }}
        className="absolute inset-0 rounded-[inherit] outline-offset-8"
        style={{ borderRadius: radius / CARD_SCALE }}
      />
      <button
        type="button"
        aria-label={`Close ${title}`}
        data-card-close
        onClick={(e) => e.detail === 0 && onClose()}
        className="glass-dark absolute -top-[64px] right-0 grid size-[58px] place-items-center rounded-full text-[34px] leading-none text-white"
      >
        ×
      </button>
    </m.div>
  );
}
