"use client";

import { useEffect, useRef } from "react";

import { profile } from "@content/profile";
import { openApp } from "@/lib/router";
import { animateTo, easeOut } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/store";
import { countLabel } from "@/lib/utils";
import { worldRows } from "@/lib/world-map";

const { stats } = profile;

const STATS = [
  { value: stats.students, format: countLabel, label: "students" },
  {
    value: stats.countries,
    format: (n: number) => `${Math.round(n)}+`,
    label: "countries",
  },
  {
    value: stats.platforms,
    format: (n: number) => `${Math.round(n)}+`,
    label: "platforms",
  },
  {
    value: stats.yearsTeaching,
    format: (n: number) => `${Math.round(n)} yrs`,
    label: "teaching",
  },
];

// Dots that glow in the finish colour: a sparse, deterministic scatter over land.
const DOTS = worldRows.flatMap((row, y) =>
  [...row].flatMap((cell, x) =>
    cell === "#" ? [{ x, y, lit: (x * 7 + y * 13) % 5 === 0 }] : [],
  ),
);
const COLS = worldRows[0].length;
const ROWS = worldRows.length;

let countedOnce = false;

function CountUp({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (countedOnce || prefersReducedMotion()) {
      el.textContent = format(value);
      return;
    }
    const controls = animateTo(0, value, {
      duration: 1.6,
      ease: easeOut,
      onUpdate: (n) => (el.textContent = format(n)),
    });
    return () => controls.stop();
  }, [value, format]);
  useEffect(() => {
    countedOnce = true;
  }, []);
  return (
    <span ref={ref} suppressHydrationWarning>
      {format(value)}
    </span>
  );
}

export function ImpactWidget() {
  return (
    <button
      type="button"
      data-nav
      data-app-icon="journey-widget"
      onClick={() => openApp("journey")}
      aria-label={`Impact: ${STATS.map((s) => `${s.format(s.value)} ${s.label}`).join(", ")}. Open Journey`}
      className="icon-press flex size-full flex-col items-center gap-[5px] select-none"
    >
      <span
        data-widget-tile
        className="wiggle-item glass-dark [container-type:size] flex min-h-0 w-full flex-1 items-center gap-[3.4cqw] overflow-hidden widget-r px-[4cqw] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] transition-transform duration-150 ease-out [.icon-press:active_&]:scale-[0.97]"
      >
        <svg
          viewBox={`0 0 ${COLS} ${ROWS}`}
          className="h-[78%] w-[54%] shrink-0"
          aria-hidden
          preserveAspectRatio="xMidYMid meet"
        >
          {DOTS.map(({ x, y, lit }) => (
            <circle
              key={`${x}-${y}`}
              cx={x + 0.5}
              cy={y + 0.5}
              r={lit ? 0.36 : 0.3}
              className={lit ? "dot-wave fill-finish" : "fill-white/30"}
              style={lit ? { animationDelay: `${x * 70}ms` } : undefined}
            />
          ))}
        </svg>
        <span className="grid min-w-0 flex-1 grid-cols-2 gap-x-[2cqw] gap-y-[min(8px,5cqh)] text-left">
          {STATS.map((s) => (
            <span key={s.label} className="flex min-w-0 flex-col leading-none">
              <span className="text-[clamp(14px,min(4.6cqw,13cqh),18px)] font-bold tracking-tight whitespace-nowrap tabular-nums">
                <CountUp value={s.value} format={s.format} />
              </span>
              <span className="mt-1 truncate text-[clamp(9.5px,min(2.9cqw,8cqh),11px)] font-medium text-white/70">{s.label}</span>
            </span>
          ))}
        </span>
      </span>
      <span className="icon-label">Impact</span>
    </button>
  );
}
