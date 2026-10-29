"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { profile } from "@content/profile";
import { story } from "@content/story";
import { timeline } from "@content/timeline";
import { AppHeader, AppScreen, PushView, useLastValue } from "@/components/ui/app-shell";
import { TINT, Tile, type GlyphName } from "@/components/ui/grouped";
import { blurOf } from "@/lib/placeholders";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";
import { cn } from "@/lib/utils";

/*
 * Journey, laid out like an Apple app: a large title, inset-grouped sections 12 px apart, one
 * system type scale (title 17/600, secondary 15/400 grey, caption 13), and a timeline whose years
 * are its section headers, strung on a hairline rail. Rows push a detail view (swipe from the left
 * edge to go back). Every word comes from content/ (profile, story, timeline); none is written here.
 * Type is in rem, so Settings → Larger text scales all of it.
 */

/* ───────────────────────── Content, shaped (never reworded) ───────────────────────── */

const noEmoji = (s: string) => s.replace(/\s*\p{Extended_Pictographic}️?/gu, "");
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One look per milestone, in timeline order. */
const LOOKS: { glyph: GlyphName; tint: string }[] = [
  { glyph: "play", tint: TINT.red },
  { glyph: "stack", tint: TINT.indigo },
  { glyph: "easel", tint: TINT.orange },
  { glyph: "book", tint: TINT.blue },
  { glyph: "mic", tint: TINT.teal },
  { glyph: "sparkle", tint: TINT.purple },
];

/** A milestone's sentence, split at its first semicolon: what happened, then what came with it. */
const MILESTONES = timeline.map((t, i) => {
  const [title, ...rest] = t.text.split(";");
  return {
    year: t.year,
    id: String(t.year),
    title: title.trim(),
    detail: rest.length ? capitalise(rest.join(";").trim()) : null,
    ...LOOKS[i % LOOKS.length],
  };
});
type Milestone = (typeof MILESTONES)[number];

const STORY = story.map(noEmoji);

/* ───────────────────────── Building blocks ───────────────────────── */

function Section({ header, footer, children, className }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mb-3", className)}>
      {header && <h2 className="px-4 pt-2.5 pb-2.5 text-ios-headline font-semibold text-app-muted">{header}</h2>}
      <div className="overflow-hidden rounded-ios-xxl bg-app-group">{children}</div>
      {footer && <p className="mt-2 px-4 text-ios-footnote leading-[1rem] text-app-muted">{footer}</p>}
    </section>
  );
}

/** A grouped row (a tall row): tile, Headline title (17/600) and Subheadline secondary (15 grey); a chevron only when it pushes. */
function Row({
  leading,
  title,
  secondary,
  onPress,
  label,
  data,
}: {
  leading?: ReactNode;
  title: ReactNode;
  secondary?: ReactNode;
  onPress?: () => void;
  label?: string;
  data?: Record<string, string>;
}) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1 py-3">
        <span className="block text-ios-headline font-semibold">{title}</span>
        {secondary && <span className="block text-ios-subheadline text-app-muted">{secondary}</span>}
      </span>
      {onPress && <ChevronRight aria-hidden className="size-4 shrink-0 text-ios-label-tertiary" strokeWidth={2.6} />}
    </>
  );
  const classes = "relative flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left";
  if (!onPress) return <div className={classes}>{body}</div>;
  return (
    <button type="button" onClick={onPress} aria-label={label} {...data} className={cn(classes, "active:bg-ios-fill-tertiary")}>
      {body}
    </button>
  );
}

/** The hairline between rows, inset to where the text starts (past the tile) */
const Hairline = ({ inset = 58 }: { inset?: number }) => (
  <span aria-hidden className="block h-[0.5px] bg-app-divider" style={{ marginLeft: inset }} />
);

/* ───────────────────────── The timeline ───────────────────────── */

/** Tile centre from the card's left edge: 16 px inset + half a 30 px tile. The rail runs through it. */
const RAIL_X = 31;

/**
 * Years as section headers, each milestone in its own inset card, all strung on one hairline that
 * runs from the first year to the last tile: under the tiles, over the cards, past each year's node.
 */
function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const [rail, setRail] = useState<{ top: number; height: number } | null>(null);

  // The rail spans the first year's node to the last tile; measured, since rows grow with the text size
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const tiles = el.querySelectorAll<HTMLElement>("[data-rail-tile]");
      const first = el.querySelector<HTMLElement>("[data-rail-node]");
      if (tiles.length < 2 || !first) return setRail(null);
      const centre = (t: HTMLElement) => {
        let y = t.offsetHeight / 2;
        for (let n: HTMLElement | null = t; n && n !== el; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
        return y;
      };
      const top = centre(first);
      setRail({ top, height: centre(tiles[tiles.length - 1]) - top });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative">
      {rail && <span aria-hidden className="absolute z-1 w-px bg-app-divider" style={{ left: RAIL_X - 0.5, ...rail }} />}
      <ol>
        {MILESTONES.map((m) => (
          <li key={m.id} className="mb-3">
            <h3 className="relative flex items-center pt-2.5 pb-2.5 pl-[58px] text-ios-headline font-semibold text-app-muted tabular-nums">
              <span aria-hidden data-rail-node className="absolute z-1 size-[7px] rounded-full bg-[color-mix(in_oklab,var(--app-muted)_60%,var(--app-background))]" style={{ left: RAIL_X - 3.5 }} />
              {m.year}
            </h3>
            <div className="overflow-hidden rounded-ios-xxl bg-app-group">
              <Row
                leading={<Tile glyph={m.glyph} tint={m.tint} data={{ "data-rail-tile": "" }} />}
                title={m.title}
                secondary={m.detail}
                onPress={() => openApp("journey", m.id)}
                label={`${m.year}: ${m.title}`}
                data={{ "data-journey-row": m.id }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────────────────────── Detail views ───────────────────────── */

const HIGHLIGHT_PLACE = profile.highlight.title.split(" (")[0];

function MilestoneDetail({ m }: { m: Milestone }) {
  const index = MILESTONES.indexOf(m);
  // Facts elsewhere in the content that belong to this year: the story's own paragraph about it,
  // and the highlight when this milestone is where it happened
  const told = STORY.filter((p) => p.includes(String(m.year)));
  const highlight = m.title.includes(HIGHLIGHT_PLACE) ? profile.highlight : null;
  return (
    <AppScreen>
      <AppHeader title={m.id} backLabel="Back to Journey" subtitle={`Milestone ${index + 1} of ${MILESTONES.length}`} />
      <Section>
        <div className="flex flex-col items-center px-4 pt-6 pb-5 text-center">
          <Tile glyph={m.glyph} tint={m.tint} size={60} />
          <p className="mt-3 text-[1.375rem] leading-tight font-bold tracking-[-0.015em]">{m.title}</p>
          {m.detail && <p className="mt-1.5 text-[0.9375rem] leading-[1.4] text-app-muted">{m.detail}</p>}
        </div>
      </Section>
      {highlight && (
        <Section header="Highlight">
          <Row leading={<Tile glyph="star" tint={TINT.orange} />} title={highlight.title} secondary={highlight.text} />
        </Section>
      )}
      {told.length > 0 && (
        <Section header="From my story">
          <div className="space-y-3 px-4 py-3.5 text-[1.0625rem] leading-[1.45]">
            {told.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Section>
      )}
    </AppScreen>
  );
}

function StoryDetail() {
  return (
    <AppScreen>
      <AppHeader title="My Story" backLabel="Back to Journey" />
      <Section>
        <div className="space-y-4 px-4 py-4 text-[1.0625rem] leading-[1.5]">
          {STORY.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Section>
    </AppScreen>
  );
}

function Detail({ id }: { id: string }) {
  if (id === "story") return <StoryDetail />;
  const m = MILESTONES.find((x) => x.id === id);
  return m ? <MilestoneDetail m={m} /> : null;
}

/* ───────────────────────── The app ───────────────────────── */

export default function JourneyApp() {
  const sub = useOS((s) => (s.route.app === "journey" ? s.route.sub : null));
  const shown = useLastValue(sub);

  return (
    <>
      <AppScreen>
        <AppHeader title="Journey" subtitle={profile.journeySubtitle} />

        <Section>
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <Image
              src={profile.avatar}
              {...blurOf(profile.avatar)}
              alt={profile.name}
              width={64}
              height={64}
              className="size-16 shrink-0 rounded-full object-cover"
            />
            <span className="min-w-0">
              <span className="block text-[1.25rem] leading-tight font-semibold tracking-[-0.015em]">{profile.name}</span>
              <span className="mt-0.5 block text-[0.9375rem] leading-snug text-app-muted">
                {profile.role} · {profile.location}
              </span>
            </span>
          </div>
          <Hairline inset={16} />
          <p className="px-4 py-2.5 text-ios-footnote text-app-muted">{profile.badges.join(" · ")}</p>
        </Section>

        <Section header="About">
          <Row
            leading={<Tile glyph="quote" tint={TINT.gray} />}
            title="My Story"
            secondary={<span className="line-clamp-2">{STORY[0]}</span>}
            onPress={() => openApp("journey", "story")}
            label="My Story"
            data={{ "data-journey-row": "story" }}
          />
        </Section>

        <h2 className="mt-5 px-4 text-[1.375rem] leading-tight font-bold tracking-[-0.015em]">
          Roots to leaves
        </h2>
        <Timeline />

        <Section header="Education">
          <Row leading={<Tile glyph="cap" tint={TINT.blue} />} title={profile.education} secondary="Engineering" />
        </Section>

        <Section header="Highlight">
          <Row leading={<Tile glyph="star" tint={TINT.orange} />} title={profile.highlight.title} secondary={profile.highlight.text} />
        </Section>
      </AppScreen>

      <PushView open={!!sub} label="Journey details">
        {shown && <Detail id={shown} />}
      </PushView>
    </>
  );
}
