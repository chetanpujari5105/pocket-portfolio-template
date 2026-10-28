"use client";

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { useMotionValue } from "motion/react";
import * as m from "motion/react-m";

import type { HomeItem } from "@content/schema";
import { setLaunchOrigin } from "@/lib/launch";
import { animateTo, springs } from "@/lib/motion";
import { openApp } from "@/lib/router";
import { cn } from "@/lib/utils";

import { BrandGlyph } from "./BrandIcon";
import { HOME_MARKS } from "./social-icons";
import { Glyph } from "./icons";

type Props = {
  item: Pick<HomeItem, "id" | "label" | "icon" | "colors" | "app" | "href" | "brand">;
  showLabel?: boolean;
  /** Custom tile content (e.g. a folder's preview) */
  tile?: ReactNode;
  className?: string;
  /** Opens something other than the item's app or link (folders) */
  onOpen?: (tile: HTMLElement | null) => void;
  /** `data-icon-tile` override (folders: `f:<id>`), the anchor launches and folders zoom from */
  tileKey?: string;
};

/**
 * Press feedback on pointer-down: the tile sinks to 0.92 on the snappy spring and comes back
 * with a slight overshoot. Moving more than 10 px cancels the press (a page swipe has started).
 */
function usePress() {
  const scale = useMotionValue(1);
  const start = useRef<{ x: number; y: number } | null>(null);
  const release = () => {
    if (!start.current) return;
    start.current = null;
    animateTo(scale, 1, springs.release);
  };
  return {
    scale,
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (e.button !== 0) return;
        start.current = { x: e.clientX, y: e.clientY };
        animateTo(scale, 0.92, springs.snappy);
      },
      onPointerMove: (e: PointerEvent) => {
        const s = start.current;
        if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) release();
      },
      onPointerUp: release,
      onPointerCancel: release,
      onPointerLeave: release,
    },
  };
}

/** The squircle itself. `tileKey: null` draws a copy that launches and folders don't anchor to. */
export function IconFace({ item, tile, tileKey }: Pick<Props, "item" | "tile"> & { tileKey?: string | null }) {
  const mark = item.brand ? HOME_MARKS[item.brand] : undefined;
  const brand = mark?.tile;
  const style = brand
    ? ({ "--tile": brand.bg, color: brand.fg } as CSSProperties)
    : ({ "--c1": item.colors[0], "--c2": item.colors[1] } as CSSProperties);
  return (
    <span
      className={cn("icon-tile wiggle-item", brand && "icon-brand")}
      data-icon-tile={tileKey === null ? undefined : (tileKey ?? item.app ?? item.id)}
      style={style}
    >
      {tile ??
        (brand ? (
          <BrandGlyph mark={mark!} style={{ width: `${brand.size * 100}%`, height: `${brand.size * 100}%` }} />
        ) : (
          <Glyph name={item.icon} />
        ))}
    </span>
  );
}

export function AppIcon({ item, showLabel = true, tile, className, onOpen, tileKey }: Props) {
  const { scale, handlers } = usePress();
  const content = (
    <>
      <m.span style={{ scale }} className="block">
        <IconFace item={item} tile={tile} tileKey={tileKey} />
      </m.span>
      {showLabel && <span className="icon-label max-w-[calc(var(--icon)+14px)] truncate">{item.label}</span>}
    </>
  );
  const classes = cn(
    "icon-press flex flex-col items-center gap-[5px] rounded-[14px] outline-offset-4 select-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]",
    className,
  );

  if (onOpen) {
    return (
      <button
        type="button"
        aria-label={`Open ${item.label} folder`}
        data-nav
        data-folder-open
        className={classes}
        {...handlers}
        onClick={(e) => onOpen(e.currentTarget.querySelector<HTMLElement>("[data-icon-tile]"))}
      >
        {content}
      </button>
    );
  }

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${item.label} (opens in a new tab)`}
        data-nav
        className={classes}
        {...handlers}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Open ${item.label}`}
      data-app-icon={item.app}
      data-nav
      className={classes}
      {...handlers}
      onClick={(e) => {
        if (!item.app) return;
        const tileEl = e.currentTarget.querySelector<HTMLElement>("[data-icon-tile]");
        if (tileEl) setLaunchOrigin(item.app, tileEl);
        openApp(item.app);
      }}
    >
      {content}
    </button>
  );
}
