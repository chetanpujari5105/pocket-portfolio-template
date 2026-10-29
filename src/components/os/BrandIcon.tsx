import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * An official brand mark (see scripts/brand-icons.mjs) with its tile: the brand's own colours
 * (white on its colour, or its colour on white), never recoloured or stretched.
 */
export type BrandMark = {
  id: string;
  title: string;
  hex: string;
  viewBox: string;
  path: string;
  tile: { bg: string; fg: string; size: number };
};

/** Just the mark, filled with `currentColor` unless a colour is given. */
export function BrandGlyph({ mark, className, style }: { mark: BrandMark; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox={mark.viewBox} aria-hidden className={className} style={style} fill="currentColor">
      <path d={mark.path} />
    </svg>
  );
}

/**
 * A squircle brand tile. `as="icon"` is a full `.icon-tile` (home screen / folder); `as="row"` is
 * the small tile used in list rows (30 px unless `className` sets a size).
 */
export function BrandTile({ mark, as = "row", className }: { mark: BrandMark; as?: "icon" | "row"; className?: string }) {
  const { bg, fg, size } = mark.tile;
  const glyph = { width: `${size * 100}%`, height: `${size * 100}%` };
  if (as === "icon")
    return (
      <span className={cn("icon-tile", className)} style={{ "--tile": bg } as CSSProperties}>
        <BrandGlyph mark={mark} style={{ ...glyph, color: fg }} />
      </span>
    );
  return (
    <span
      aria-hidden
      className={cn("squircle grid shrink-0 place-items-center", className?.includes("size-") ? className : cn("size-[30px]", className))}
      style={{ background: bg, color: fg }}
    >
      <BrandGlyph mark={mark} style={glyph} />
    </span>
  );
}
