import type { CSSProperties, ReactNode } from "react";

import { packIcon } from "@/lib/icon-pack";

/*
 * Original glyph set for the home screen. Every glyph is one flat silhouette on a 24×24 grid:
 * solid shapes, no hairlines, no second tone, so they share one weight at 60 px and at 180 px.
 * A path's `strokeWidth` only rounds its corners (the stroke is painted with the fill). Parts are
 * told apart by clear gaps and evenodd cut-outs.
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
  // Courses: a mortarboard with its tassel
  cap: (
    <>
      <path d="M12 3.4 22.4 8.6 12 13.8 1.6 8.6 12 3.4Z" strokeWidth="1.4" />
      <path d="M6.2 12.9v3.3c0 2 2.6 3.7 5.8 3.7s5.8-1.7 5.8-3.7v-3.3L12 15.9l-5.8-3Z" />
      <path d="M19.9 9.4h1.6v6.4h-1.6z" />
      <circle cx="20.7" cy="17.1" r="1.7" />
    </>
  ),
  // Journey: a sprout on its patch of ground
  sprout: (
    <>
      <rect x="10.9" y="10.6" width="2.3" height="9.4" rx="1.15" />
      <path d="M11.2 13.6C6.4 13.9 3 10.8 2.8 6c4.9-.3 8.4 2.8 8.4 7.6Z" />
      <path d="M12.8 11.6c-.1-5.7 3.3-9 8.6-8.9.1 5.6-3.3 9-8.6 8.9Z" />
      <rect x="5.4" y="19.2" width="13.2" height="2.6" rx="1.3" />
    </>
  ),
  // Expertise: three sparkles of falling size
  sparkles: (
    <>
      <path d="M9.6 2.6Q10.6 10 18 11.2 10.6 12.4 9.6 19.8 8.6 12.4 1.2 11.2 8.6 10 9.6 2.6Z" />
      <path d="M18.6 1.4Q19 4.7 22.4 5.2 19 5.7 18.6 9 18.2 5.7 14.8 5.2 18.2 4.7 18.6 1.4Z" />
      <path d="M18.4 15Q18.7 17.5 21.2 17.9 18.7 18.3 18.4 20.8 18.1 18.3 15.6 17.9 18.1 17.5 18.4 15Z" />
    </>
  ),
  // Platforms: three stacked layers, parted by a clear gap
  layers: (
    <>
      <path d="M12 2.8 21 7.5 12 12.2 3 7.5 12 2.8Z" strokeWidth="1.6" />
      <path d="M5.4 11.3 3 12.6l9 4.7 9-4.7-2.4-1.3-6.6 3.5-6.6-3.5Z" strokeWidth="1" />
      <path d="M5.4 15.8 3 17.1l9 4.7 9-4.7-2.4-1.3-6.6 3.5-6.6-3.5Z" strokeWidth="1" />
    </>
  ),
  // Reviews: a soft five-point star
  star: <path d="M12 3.2 14.7 8.7l6 .9-4.4 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.4-4.2 6-.9L12 3.2Z" strokeWidth="2.2" />,
  // Blog: a fountain-pen nib with its collar
  nib: (
    <>
      <path d="M8.6 2.2h6.8a1 1 0 0 1 1 1v2.5H7.6V3.2a1 1 0 0 1 1-1Z" />
      <path
        fillRule="evenodd"
        d="M7.6 7.2h8.8l2.9 4.2c0 3.2-3.8 7.2-7.3 10.8-3.5-3.6-7.3-7.6-7.3-10.8l2.9-4.2Zm4.4 3.1a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Zm-.7 3.6v6.3h1.4v-6.3h-1.4Z"
        strokeWidth="1"
      />
    </>
  ),
  // Services: the CP bolt
  bolt: <path d="M13.9 2.2 4.8 13.4h6.3l-1.2 8.4 9.3-11.3h-6.4l1.1-8.3Z" strokeWidth="1.5" />,
  // Contact: a paper plane, its fold cut in
  plane: (
    <path
      d="M21.6 2.4 2.7 10.2c-.8.4-.8 1.5 0 1.8l6.5 2.3 9.4-8.4-7.6 9.6 2.5 6.8c.3.8 1.4.8 1.7 0L21.6 2.4Z"
      strokeWidth="1.2"
    />
  ),
  // Settings: two switches, one on (solid, knob cut out), one off (an outline, knob at rest)
  toggles: (
    <>
      <path
        fillRule="evenodd"
        d="M6.6 3h10.8a4.2 4.2 0 0 1 0 8.4H6.6a4.2 4.2 0 0 1 0-8.4Zm10.6 1.7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"
      />
      <path
        fillRule="evenodd"
        d="M6.6 12.6h10.8a4.2 4.2 0 0 1 0 8.4H6.6a4.2 4.2 0 0 1 0-8.4Zm0 1.8a2.4 2.4 0 0 0 0 4.8h10.8a2.4 2.4 0 0 0 0-4.8H6.6Z"
      />
      <circle cx="6.8" cy="16.8" r="2.1" />
    </>
  ),
  // Rocket (Projects): body with a porthole, fins and a flame
  rocket: (
    <>
      <path
        fillRule="evenodd"
        d="M12 1.6c3.4 2.3 5.1 6 5.1 10.1v4.8H6.9v-4.8c0-4.1 1.7-7.8 5.1-10.1Zm0 6.4a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z"
      />
      <path d="M6.9 12.4 3.6 15.7v3.7l3.3-1.7v-5.3Zm10.2 0 3.3 3.3v3.7l-3.3-1.7v-5.3Z" strokeWidth="1" />
      <path d="M9.7 18.1h4.6L12 22.4l-2.3-4.3Z" strokeWidth="1.2" />
    </>
  ),
  globe: (
    <g fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="3.9" ry="9" />
      <path d="M3.4 9h17.2M3.4 15h17.2" />
    </g>
  ),
  newspaper: (
    <path
      fillRule="evenodd"
      d="M4.5 3.5h11.8c.8 0 1.4.6 1.4 1.4V18c0 .8.6 1.5 1.4 1.5s1.4-.7 1.4-1.5V8h1v10c0 2-1.5 3.5-3.4 3.5H5.5C3.6 21.5 2.5 20 2.5 18V5.5c0-1.1.9-2 2-2ZM6 7v4.5h8.2V7H6Zm0 6.5V15h8.2v-1.5H6Zm0 3V18h5.5v-1.5H6Z"
    />
  ),
  chat: (
    <path
      fillRule="evenodd"
      d="M5 3.5h14c1.7 0 3 1.3 3 3v9c0 1.7-1.3 3-3 3h-8.2L6 22v-3.5H5c-1.7 0-3-1.3-3-3v-9c0-1.7 1.3-3 3-3Zm7 2.3c-.4 2.4-1.3 3.3-3.7 3.7 2.4.4 3.3 1.3 3.7 3.7.4-2.4 1.3-3.3 3.7-3.7-2.4-.4-3.3-1.3-3.7-3.7Z"
      strokeWidth="1"
    />
  ),
  gear: <path fillRule="evenodd" d={GEAR} />,
  play: (
    <path
      fillRule="evenodd"
      d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19ZM9.8 8v8l6.6-4-6.6-4Z"
    />
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

/** One flat glyph in the text colour (white on every app tile). */
export function Glyph({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      data-glyph={name}
    >
      {glyphs[name] ?? glyphs.sparkles}
    </svg>
  );
}

/**
 * Props for anything drawn as an app's icon face outside the home tile (launch overlay, app
 * switcher, folder previews, notifications): the `.tile-face` class paints `--face`, the same
 * gradient, or the icon pack's image when it has one for this app (src/lib/icon-pack.ts). The
 * image is contained, so the launch overlay (a tall window that starts as its middle square)
 * shows it whole.
 */
export function faceProps(item: { id: string; colors: readonly [string, string] | string[] }) {
  const art = packIcon(item.id);
  const style = art
    ? { "--face": `url(${art}) center / contain no-repeat` }
    : { "--c1": item.colors[0], "--c2": item.colors[1] };
  return { style: style as CSSProperties, "data-pack": art ? "" : undefined };
}

/** The glyph over a face, or nothing when the face is the icon pack's image (it carries its own). */
export function FaceGlyph({ item, className }: { item: { id: string; icon: string }; className?: string }) {
  return packIcon(item.id) ? null : <Glyph name={item.icon} className={className} />;
}
