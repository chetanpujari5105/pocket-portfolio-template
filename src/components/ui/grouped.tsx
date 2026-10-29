"use client";

import { Children, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * Inset-grouped lists, laid out like iOS Settings: sections on the grouped
 * background with radius XXL, Nested headers (Headline, secondary) and Footnote footers; rows at
 * least 44 px (60 with a second line) with a 30 px tinted tile, hairlines inset to where the text
 * starts, a press highlight, a chevron only on rows that push, and an up-right arrow on rows that
 * leave the site. Type is in rem, so Settings → Larger text scales all of it.
 */

/* ───────────────────────── Glyphs: original, drawn on a 24 grid like SF Symbols ───────────────────────── */

export const GLYPHS = {
  play: <path fillRule="evenodd" stroke="none" d="M12 3.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8Zm-1.9 5v6.8l5.6-3.4Z" />,
  stack: (
    <>
      <path d="m12 4 8.5 4.3L12 12.6 3.5 8.3Z" />
      <path d="m4.8 11.4 7.2 3.7 7.2-3.7M4.8 14.9l7.2 3.7 7.2-3.7" fill="none" />
    </>
  ),
  easel: (
    <>
      <path d="M4.5 5h15v10h-15Z" />
      <path d="M12 3.5V5m-3.5 10L7 20.5M15.5 15l1.5 5.5" fill="none" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.6C10.2 5.3 7.7 4.8 4 5v13c3.7-.2 6.2.3 8 1.6Z" />
      <path d="M12 6.6c1.8-1.3 4.3-1.8 8-1.6v13c-3.7-.2-6.2.3-8 1.6Z" />
    </>
  ),
  mic: (
    <>
      <path d="M9.2 6.2a2.8 2.8 0 0 1 5.6 0v5.3a2.8 2.8 0 0 1-5.6 0Z" />
      <path d="M6.4 11.2a5.6 5.6 0 0 0 11.2 0M12 16.8v3.4m-3 0h6" fill="none" />
    </>
  ),
  sparkle: (
    <>
      <path d="M10 4.5c.6 3.6 2 5 5.6 5.6-3.6.6-5 2-5.6 5.6-.6-3.6-2-5-5.6-5.6 3.6-.6 5-2 5.6-5.6Z" />
      <path d="M17.2 13.6c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7Z" />
    </>
  ),
  cap: (
    <>
      <path d="m12 5 9.5 4.6L12 14.2 2.5 9.6Z" />
      <path d="M6.5 11.6v3.7c1.4 1.3 3.3 2 5.5 2s4.1-.7 5.5-2v-3.7M20 10.4v5" fill="none" />
    </>
  ),
  star: <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z" />,
  quote: <path d="M5 8.5A2.5 2.5 0 0 1 7.5 6H10v5H7.6c0 1.6.8 2.7 2.4 3.2V17c-3.2-.5-5-2.9-5-6.4Zm9 0A2.5 2.5 0 0 1 16.5 6H19v5h-2.4c0 1.6.8 2.7 2.4 3.2V17c-3.2-.5-5-2.9-5-6.4Z" />,
  globe: (
    <g fill="none">
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.3 2.3 3.4 5 3.4 8s-1.1 5.7-3.4 8c-2.3-2.3-3.4-5-3.4-8S9.7 6.3 12 4Z" />
    </g>
  ),
  megaphone: (
    <>
      <path d="M4.5 9.8h3.2L15 5.5v13l-7.3-4.3H4.5Z" />
      <path d="M8.5 14.5 10 19M18.2 9.6a3.4 3.4 0 0 1 0 4.8" fill="none" />
    </>
  ),
  video: (
    <>
      <path d="M4 7.5h10.5v9H4Z" />
      <path d="m14.5 11 5.5-3.2v8.4L14.5 13Z" />
    </>
  ),
  pen: (
    <>
      <path fillRule="evenodd" d="M12 3.8 17.6 12 14.5 18h-5L6.4 12Zm0 6.4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
      <path d="M9.5 20.5h5" fill="none" />
    </>
  ),
  mail: (
    <g fill="none">
      <rect x="3.5" y="6" width="17" height="12" rx="2.2" />
      <path d="m4.5 7.5 7.5 5.6 7.5-5.6" />
    </g>
  ),
  search: (
    <g fill="none">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m14.8 14.8 4.7 4.7" />
    </g>
  ),
  code: <path d="m8.5 7.5-4.5 4.5 4.5 4.5m7-9 4.5 4.5-4.5 4.5m-2-11-3 13" fill="none" />,
  bolt: <path d="M13.2 3.5 5.8 13.3h5.4l-1 7.2 7.4-9.8h-5.4Z" />,
  shapes: (
    <g fill="none">
      <circle cx="9.5" cy="9.5" r="5" />
      <path d="M11 11h8.5v8.5H11Z" />
    </g>
  ),
} satisfies Record<string, ReactNode>;

export type GlyphName = keyof typeof GLYPHS;

/** System accents (lib/ios-tokens.ts), one flat fill per tile as in Settings; they shift with dark mode */
export const TINT = {
  blue: "var(--ios-blue)",
  indigo: "var(--ios-indigo)",
  orange: "var(--ios-orange)",
  green: "var(--ios-green)",
  red: "var(--ios-red)",
  purple: "var(--ios-purple)",
  pink: "var(--ios-pink)",
  teal: "var(--ios-teal)",
  gray: "var(--ios-gray)",
};

/** A composed tile: one white glyph on one flat accent, cut from the squircle. */
export function Tile({
  glyph,
  tint,
  size = 30,
  className,
  data,
}: {
  glyph: GlyphName;
  tint: string;
  /** px, or any CSS length (the home widget sizes it from its container) */
  size?: number | string;
  className?: string;
  data?: Record<string, string>;
}) {
  return (
    <span
      aria-hidden
      {...data}
      className={cn("squircle relative z-2 grid shrink-0 place-items-center text-white", className)}
      style={{ width: size, height: size, background: tint }}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[66%]"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLYPHS[glyph]}
      </svg>
    </span>
  );
}

/** A tile carrying a letter instead of a glyph, for names with no mark of their own. */
export function LetterTile({ letter, background, color = "#fff", size = 30 }: { letter: string; background: string; color?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="squircle grid shrink-0 place-items-center font-semibold"
      style={{ width: size, height: size, background, color, fontSize: size * 0.53, lineHeight: 1 } as CSSProperties}
    >
      {letter}
    </span>
  );
}

/** Tile (30) + its gap (12) past the 16 px row inset: where a row's text starts. */
export const TEXT_INSET = 58;

/** The hairline between rows, inset to where the text starts */
export const Hairline = ({ inset = TEXT_INSET }: { inset?: number }) => (
  <span aria-hidden className="block h-[0.5px] bg-app-divider" style={{ marginLeft: inset }} />
);

/* ───────────────────────── Sections ───────────────────────── */

/**
 * One inset-grouped section. Each child is a row: they're listed (role list, so VoiceOver counts
 * them even with list styles off) with a hairline between, inset by `inset`.
 */
export function Section({
  header,
  footer,
  children,
  inset = TEXT_INSET,
  label,
  className,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  inset?: number;
  /** Names the list when there's no header */
  label?: string;
  className?: string;
}) {
  const rows = Children.toArray(children);
  return (
    <section className={cn("mb-3", footer ? "mb-5" : null, className)}>
      {header && <h2 className="px-4 pt-2.5 pb-2.5 text-ios-headline font-semibold text-app-muted">{header}</h2>}
      <ul role="list" aria-label={label} className="overflow-hidden rounded-ios-xxl bg-app-group">
        {rows.map((row, i) => (
          <li key={i}>
            {row}
            {i < rows.length - 1 && <Hairline inset={inset} />}
          </li>
        ))}
      </ul>
      {footer && <p className="px-4 pt-2 text-ios-footnote leading-[1rem] text-app-muted">{footer}</p>}
    </section>
  );
}

/* ───────────────────────── Rows ───────────────────────── */

type RowProps = {
  leading?: ReactNode;
  title: ReactNode;
  secondary?: ReactNode;
  /** A value on the trailing side (a count), before the chevron */
  detail?: ReactNode;
  /** A control on the trailing side (a switch); the row itself stays inert */
  accessory?: ReactNode;
  /** Pushes a detail view: gets a chevron */
  onPush?: () => void;
  /** Does something in place or opens another app: tinted title, no accessory */
  onAction?: () => void;
  /** Leaves the site: opens in a new tab, with the up-right arrow */
  href?: string;
  /** Accessible name, when the visible text isn't enough */
  label?: string;
  data?: Record<string, string>;
};

/**
 * A grouped row. With a second line the title is Headline (17/600) over a Subheadline (15)
 * secondary, at least 60 px; alone it's Body (17) at least 44 px. Nothing is clamped: long text
 * wraps (Larger Text included), and a long trailing value wraps beside the title.
 */
export function Row({ leading, title, secondary, detail, accessory, onPush, onAction, href, label, data }: RowProps) {
  const body = (
    <>
      {leading}
      {/* Beside a trailing value the title keeps its longest word whole; the value wraps instead */}
      <span className={cn("flex-1 py-2.5", detail != null ? "min-w-min" : "min-w-0")}>
        <span className={cn("block", secondary ? "text-ios-headline font-semibold" : "text-ios-body", onAction && "text-ios-label-link")}>
          {title}
        </span>
        {secondary && <span className="block text-ios-subheadline [overflow-wrap:anywhere] text-app-muted">{secondary}</span>}
      </span>
      {detail != null && <span className="py-2.5 text-right text-ios-body text-app-muted tabular-nums">{detail}</span>}
      {accessory}
      {onPush && <ChevronRight aria-hidden className="size-4 shrink-0 text-ios-label-tertiary" strokeWidth={2.6} />}
      {href && <ArrowUpRight aria-hidden data-external className="size-[1.125rem] shrink-0 text-ios-label-tertiary" strokeWidth={2.4} />}
    </>
  );
  const classes = cn(
    "relative flex w-full items-center gap-3 px-4 text-left",
    secondary ? "min-h-[3.75rem]" : "min-h-[2.75rem]",
    (onPush || onAction || href) &&
      "transition-colors duration-150 active:bg-ios-fill-tertiary focus-visible:-outline-offset-2 [@media(hover:hover)]:hover:bg-ios-fill-quaternary",
  );
  if (href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} {...data} className={classes}>
        {body}
      </a>
    );
  const onClick = onPush ?? onAction;
  if (onClick)
    return (
      <button type="button" onClick={onClick} aria-label={label} {...data} className={classes}>
        {body}
      </button>
    );
  return (
    <div {...data} className={classes}>
      {body}
    </div>
  );
}

/* ───────────────────────── The screen's one prominent action ───────────────────────── */

/**
 * A full-width capsule in the phone's finish (50 high), after the last section. With
 * `href` it leaves the site in a new tab; otherwise it acts in place.
 */
export function ProminentButton({
  children,
  href,
  onClick,
  label,
  data,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  label?: string;
  data?: Record<string, string>;
}) {
  const classes =
    "press-spring mt-5 flex min-h-[3.125rem] w-full items-center justify-center rounded-full bg-finish px-5 py-2 text-center text-ios-headline font-semibold text-finish-ink transition-[filter] duration-150 [@media(hover:hover)]:hover:brightness-110";
  if (href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} {...data} className={classes}>
        {children}
      </a>
    );
  return (
    <button type="button" onClick={onClick} aria-label={label} {...data} className={classes}>
      {children}
    </button>
  );
}
