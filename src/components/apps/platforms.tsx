"use client";

import { Fragment } from "react";

import { platforms } from "@content/platforms";
import { profile } from "@content/profile";
import { BrandTile, type BrandMark } from "@/components/os/BrandIcon";
import { udemy, youtube } from "@/components/os/brand-marks";
import { packt } from "@/components/os/brand-marks-platforms";
import { AppHeader, AppScreen, PushView } from "@/components/ui/app-shell";
import { LetterTile, Row, Section, TINT, Tile } from "@/components/ui/grouped";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";

/*
 * Platforms, laid out like Settings: a summary group (platforms, countries), one list where every
 * platform has the same 30 px squircle (its official mark on its own colour, or its initial), and
 * the distribution partners one level deeper. Every name and link comes from content/platforms.ts.
 */

/** Official marks (simple-icons, CC0) that read at 30 px. Skillshare's is a wordmark, so it gets its initial. */
const MARK: Record<string, BrandMark> = { Udemy: udemy, YouTube: youtube, Packt: packt };
/** Initial tiles: on the brand's own colour where it has one, else the neutral system grey. */
const LETTER: Record<string, { background: string; color: string }> = {
  Skillshare: { background: "#00ff84", color: "#000" },
};

const PARTNERS = [...platforms.distribution].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

function PlatformTile({ name }: { name: string }) {
  const mark = MARK[name];
  // A hairline ring keeps light tiles (YouTube's white) from melting into the white group
  if (mark) return <BrandTile mark={mark} className="size-[30px] shadow-[inset_0_0_0_0.5px_var(--ios-separator-non-opaque)]" />;
  const look = LETTER[name] ?? { background: TINT.gray, color: "#fff" };
  return <LetterTile letter={name[0]} {...look} />;
}

/** A link's handle, allowed to wrap only after a slash (never inside a name like "your-name-3"). */
function Handle({ text }: { text: string }) {
  const parts = text.split(/(?<=\/)/);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      <span className="whitespace-nowrap">{part}</span>
    </Fragment>
  ));
}

const linkLabel = (name: string) => `Open ${name} ${name === "YouTube" ? "channel" : "profile"} (opens in a new tab)`;

function Summary() {
  const cells = [
    { value: `${profile.stats.platforms}+`, label: "Platforms" },
    { value: `${profile.stats.countries}+`, label: "Countries" },
  ];
  return (
    <dl data-platforms-summary className="mb-3 grid grid-cols-2 overflow-hidden rounded-ios-xxl bg-app-group">
      {cells.map((c, i) => (
        <div key={c.label} className={i ? "border-l-[0.5px] border-app-divider" : undefined}>
          <div className="flex flex-col-reverse px-4 py-3">
            <dt className="text-ios-caption-1 text-app-muted">{c.label}</dt>
            <dd className="text-ios-title-2 font-semibold tabular-nums">{c.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

function Partners() {
  return (
    <AppScreen>
      <AppHeader title="Partners" backLabel="Back to Platforms" />
      <p className="px-4 pb-2 text-ios-footnote text-app-muted">Packt distributes my courses to these partners.</p>
      <Section inset={16} label="Distribution partners">
        {PARTNERS.map((p) => (
          <Row key={p} title={<span translate="no">{p}</span>} data={{ "data-partner": p }} />
        ))}
      </Section>
    </AppScreen>
  );
}

export default function PlatformsApp() {
  const sub = useOS((s) => (s.route.app === "platforms" ? s.route.sub : null));

  return (
    <>
      <AppScreen>
        <AppHeader title="Platforms" />
        <Summary />

        <Section header="Teach with me">
          {platforms.primary.map((p) => (
            <Row
              key={p.name}
              leading={<PlatformTile name={p.name} />}
              title={<span translate="no">{p.name}</span>}
              secondary={p.url && p.handle ? <Handle text={p.handle} /> : p.note}
              href={p.url ?? undefined}
              label={p.url ? linkLabel(p.name) : undefined}
              data={{ "data-platform": p.name }}
            />
          ))}
        </Section>

        <Section footer="Packt distributes my courses to these partners." className="mt-6">
          <Row
            leading={<Tile glyph="stack" tint={TINT.indigo} />}
            title="Distribution partners"
            detail={PARTNERS.length}
            onPush={() => openApp("platforms", "partners")}
            label={`Distribution partners, ${PARTNERS.length}`}
            data={{ "data-partners-row": "" }}
          />
        </Section>
      </AppScreen>

      <PushView open={sub === "partners"} label="Distribution partners">
        <Partners />
      </PushView>
    </>
  );
}
