import { TINT, Tile, type GlyphName } from "@/components/ui/grouped";

/** Each expertise area's tile: one glyph on one accent, in Expertise and on the home Smart Stack.
 * ✏️ EDIT: add a line per id in content/expertise.ts (glyphs: GLYPHS in components/ui/grouped.tsx);
 * an id without one gets a grey sparkle. */
const LOOK: Record<string, { glyph: GlyphName; tint: string }> = {
  ai: { glyph: "sparkle", tint: TINT.purple },
  uiux: { glyph: "pen", tint: TINT.pink },
  video: { glyph: "video", tint: TINT.red },
  graphic: { glyph: "shapes", tint: TINT.orange },
  web: { glyph: "code", tint: TINT.blue },
  "course-creation": { glyph: "cap", tint: TINT.indigo },
  marketing: { glyph: "megaphone", tint: TINT.teal },
  automation: { glyph: "bolt", tint: TINT.green },
  design: { glyph: "pen", tint: TINT.pink },
  teaching: { glyph: "cap", tint: TINT.indigo },
};

export function ExpertiseTile({ id, size }: { id: string; size?: number | string }) {
  const look = LOOK[id] ?? { glyph: "sparkle", tint: TINT.gray };
  return <Tile glyph={look.glyph} tint={look.tint} size={size} />;
}
