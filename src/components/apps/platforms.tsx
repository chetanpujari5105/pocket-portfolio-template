"use client";

import { platforms } from "@content/platforms";
import { profile } from "@content/profile";
import { BrandGlyph, BrandTile, type BrandMark } from "@/components/os/BrandIcon";
import { udemy, youtube } from "@/components/os/brand-marks";
import { coursera, oreilly, packt, skillshare } from "@/components/os/brand-marks-platforms";
import { AppHeader, AppScreen, ListGroup, ListRow, SectionTitle } from "@/components/ui/app-shell";

/** Platforms whose official mark we carry; the rest keep an original lettered tile. */
const BRAND_OF: Record<string, BrandMark> = {
  Udemy: udemy,
  Skillshare: skillshare,
  Packt: packt,
  YouTube: youtube,
  Coursera: coursera,
  "O'Reilly": oreilly,
};
const LETTER_COLORS: Record<string, [string, string]> = {
  TutorialsPoint: ["#4fd18b", "#1f8a50"],
  Starweaver: ["#ffb057", "#e3641b"],
};

export default function PlatformsApp() {
  return (
    <AppScreen>
      <AppHeader
        title="Platforms"
        subtitle={`${profile.stats.platforms}+ platforms · ${profile.stats.countries}+ countries`}
      />

      <ListGroup header="Teach with me">
        {platforms.primary.map((p) => (
          <ListRow
            key={p.name}
            href={p.url ?? undefined}
            leading={
              BRAND_OF[p.name] ? (
                <BrandTile mark={BRAND_OF[p.name]} className="size-9" />
              ) : (
                <span
                  aria-hidden
                  className="squircle grid size-9 place-items-center text-[15px] font-bold text-white"
                  style={{ background: `linear-gradient(165deg, ${(LETTER_COLORS[p.name] ?? ["#8e8e93", "#48484a"]).join(", ")})` }}
                >
                  {p.logo}
                </span>
              )
            }
            title={p.name}
            subtitle={p.note ?? (p.url ? "Open profile" : undefined)}
          />
        ))}
      </ListGroup>

      <SectionTitle>Also available via Packt distribution</SectionTitle>
      <ul className="flex flex-wrap gap-1.5 px-1">
        {platforms.distribution.map((d) => (
          <li key={d} className="inline-flex items-center gap-1.5 rounded-full bg-app-group px-3 py-1.5 text-[13px] font-medium text-app-secondary">
            {BRAND_OF[d] && <BrandGlyph mark={BRAND_OF[d]} className="size-3.5" style={{ color: BRAND_OF[d].hex }} />}
            {d}
          </li>
        ))}
      </ul>
    </AppScreen>
  );
}
