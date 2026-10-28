import { useId, type ReactNode } from "react";

/*
 * Original glyph set for the home screen. Every glyph is drawn on a 24×24 grid,
 * filled white, and sits on a gradient tile (see AppIcon). Cut-outs use evenodd.
 */

function gearPath(teeth = 8, outer = 10, inner = 7.6, hole = 3.4) {
  const c = 12;
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const corners = [
      [inner, a - step * 0.5],
      [inner, a - step * 0.26],
      [outer, a - step * 0.16],
      [outer, a + step * 0.16],
      [inner, a + step * 0.26],
    ] as const;
    for (const [r, t] of corners)
      pts.push(`${(c + r * Math.cos(t)).toFixed(2)} ${(c + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z M${c + hole} ${c}a${hole} ${hole} 0 1 0 ${-hole * 2} 0a${hole} ${hole} 0 1 0 ${hole * 2} 0Z`;
}

const GEAR = gearPath();

export const glyphs: Record<string, ReactNode> = {
  cap: (
    <>
      <path d="M12 3.2 1.5 8.6 12 14l8.2-4.2V15h1.8V8.6L12 3.2Z" />
      <path d="M5.2 12v3.9c0 1.9 3 3.6 6.8 3.6s6.8-1.7 6.8-3.6V12L12 15.5 5.2 12Z" />
    </>
  ),
  sprout: (
    <>
      <path d="M11 21v-7h2v7h-2Z" />
      <path d="M11.4 13.6C6.8 13.9 3.2 10.7 3 6.1L3 5h1.1c4.6 0 7.8 3.4 7.3 8.6Z" />
      <path d="M12.6 11.2C12.2 6.6 15.1 3.2 19.7 3H21v1.2c-.2 4.4-3.6 7.3-8.4 7Z" />
    </>
  ),
  sparkles: (
    <>
      <path d="M10 2.5c.7 4.3 2.4 6 6.7 6.7-4.3.7-6 2.4-6.7 6.7-.7-4.3-2.4-6-6.7-6.7 4.3-.7 6-2.4 6.7-6.7Z" />
      <path d="M18 13.5c.4 2.2 1.2 3 3.4 3.4-2.2.4-3 1.2-3.4 3.4-.4-2.2-1.2-3-3.4-3.4 2.2-.4 3-1.2 3.4-3.4Z" />
    </>
  ),
  globe: (
    <g fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="3.9" ry="9" />
      <path d="M3.4 9h17.2M3.4 15h17.2" />
    </g>
  ),
  star: (
    <path d="M12 2.6 14.9 8.5l6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.6Z" />
  ),
  newspaper: (
    <path
      fillRule="evenodd"
      d="M4.5 3.5h11.8c.8 0 1.4.6 1.4 1.4V18c0 .8.6 1.5 1.4 1.5s1.4-.7 1.4-1.5V8h1v10c0 2-1.5 3.5-3.4 3.5H5.5C3.6 21.5 2.5 20 2.5 18V5.5c0-1.1.9-2 2-2ZM6 7v4.5h8.2V7H6Zm0 6.5V15h8.2v-1.5H6Zm0 3V18h5.5v-1.5H6Z"
    />
  ),
  bolt: <path d="M13.8 2 4.2 13.6h6.4L9.4 22l10.4-12.3h-6.6L13.8 2Z" />,
  plane: (
    <>
      <path d="M21.6 2.4 2.9 10.1c-.8.3-.8 1.5.1 1.8l6.1 2.3L21.6 2.4Z" />
      <path d="M21.6 2.4 9.9 14.9l2.3 6.1c.3.9 1.5.9 1.8.1L21.6 2.4Z" opacity=".72" />
    </>
  ),
  chat: (
    <path
      fillRule="evenodd"
      d="M5 3.5h14c1.7 0 3 1.3 3 3v9c0 1.7-1.3 3-3 3h-8.2L6 22v-3.5H5c-1.7 0-3-1.3-3-3v-9c0-1.7 1.3-3 3-3Zm7 2.3c-.4 2.4-1.3 3.3-3.7 3.7 2.4.4 3.3 1.3 3.7 3.7.4-2.4 1.3-3.3 3.7-3.7-2.4-.4-3.3-1.3-3.7-3.7Z"
    />
  ),
  gear: <path fillRule="evenodd" d={GEAR} />,
  play: (
    <path
      fillRule="evenodd"
      d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19ZM9.8 8v8l6.6-4-6.6-4Z"
    />
  ),
  rocket: (
    <>
      <path
        fillRule="evenodd"
        d="M12 1.8c3.3 2.2 5.2 5.9 5.2 10V15l2 2.4v2.8l-3.6-1.6H8.4l-3.6 1.6v-2.8l2-2.4v-3.2c0-4.1 1.9-7.8 5.2-10Zm0 6.4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
      />
      <path d="M10.3 19.6h3.4L12 22.6l-1.7-3Z" opacity=".75" />
    </>
  ),
  search: (
    <path
      fillRule="evenodd"
      d="M10.5 3a7.5 7.5 0 0 1 6 12l4.3 4.3-1.5 1.5-4.3-4.3A7.5 7.5 0 1 1 10.5 3Zm0 2.2a5.3 5.3 0 1 0 0 10.6 5.3 5.3 0 0 0 0-10.6Z"
    />
  ),
  briefcase: (
    <path
      fillRule="evenodd"
      d="M9 3.5h6c.8 0 1.5.7 1.5 1.5v1.5H20c1.1 0 2 .9 2 2V18c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8.5c0-1.1.9-2 2-2h3.5V5c0-.8.7-1.5 1.5-1.5Zm.5 3h5V5.5h-5v1Z"
    />
  ),
  at: (
    <path
      fillRule="evenodd"
      d="M12 2.5a9.5 9.5 0 0 0 0 19c1.8 0 3.4-.4 4.8-1.2l-.9-1.7a7.5 7.5 0 1 1 3.6-6.4v.8c0 1-.6 1.8-1.5 1.8s-1.5-.8-1.5-1.8V8h-2v.9A4.5 4.5 0 1 0 15 15.6c.6.9 1.6 1.4 2.8 1.4 2 0 3.7-1.7 3.7-3.8V12A9.5 9.5 0 0 0 12 2.5Zm0 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"
    />
  ),
  camera: (
    <path
      fillRule="evenodd"
      d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm4.5 4.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm0 2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Zm5-3.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"
    />
  ),
  cameraSpark: (
    <>
      <path
        fillRule="evenodd"
        d="M7.5 4h7.6c-.1.6-.1 1.3 0 2H7.5A2.5 2.5 0 0 0 5 8.5v8A2.5 2.5 0 0 0 7.5 19h8a2.5 2.5 0 0 0 2.5-2.5v-5.6c.7.1 1.4.1 2 0v5.6a4.5 4.5 0 0 1-4.5 4.5h-8A4.5 4.5 0 0 1 3 16.5v-8A4.5 4.5 0 0 1 7.5 4Zm4 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
      />
      <path d="M19 1.5c.3 1.9 1 2.6 2.9 2.9-1.9.3-2.6 1-2.9 2.9-.3-1.9-1-2.6-2.9-2.9 1.9-.3 2.6-1 2.9-2.9Z" />
    </>
  ),
  envelope: (
    <path
      fillRule="evenodd"
      d="M4 4.5h16c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-11c0-1.1.9-2 2-2Zm.4 2.2v.4l7.6 5.1 7.6-5.1v-.4H4.4Z"
    />
  ),
};

/** A glyph lit from above: full colour at the top, a touch deeper at the bottom (gives it weight). */
export function Glyph({ name, className }: { name: string; className?: string }) {
  const id = `g${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" fill={`url(#${id})`} aria-hidden className={className} data-glyph={name}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.84" />
        </linearGradient>
      </defs>
      {glyphs[name] ?? glyphs.sparkles}
    </svg>
  );
}
