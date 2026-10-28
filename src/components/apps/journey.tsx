"use client";

import Image from "next/image";
import { GraduationCap, MapPin, Sparkles } from "lucide-react";

import { profile } from "@content/profile";
import { story } from "@content/story";
import { timeline } from "@content/timeline";
import { AppHeader, AppScreen, ListGroup, ListRow } from "@/components/ui/app-shell";

/** Roots-to-Leaves: a plant that gains a leaf each year and becomes a tree at the end. */
function Plant({ stage, last }: { stage: number; last: boolean }) {
  const stem = 6 + stage * 2.2;
  const leaves = Array.from({ length: Math.min(stage + 1, 5) }, (_, i) => i);
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
      <path d="M8 29h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-app-divider" />
      <path d={`M16 29V${29 - stem}`} stroke="#2f9e5b" strokeWidth="2" strokeLinecap="round" />
      {last ? (
        <circle cx="16" cy={29 - stem - 4} r={7} fill="#3fbf72" />
      ) : (
        leaves.map((i) => {
          const y = 28 - (i + 1) * (stem / (leaves.length + 0.5));
          const left = i % 2 === 0;
          return (
            <path
              key={i}
              d={left ? `M16 ${y}c-2.5-.2-5-1.8-5.5-4.6 2.8.1 5 1.7 5.5 4.6Z` : `M16 ${y}c2.5-.2 5-1.8 5.5-4.6-2.8.1-5 1.7-5.5 4.6Z`}
              fill="#3fbf72"
            />
          );
        })
      )}
    </svg>
  );
}

export default function JourneyApp() {
  return (
    <AppScreen>
      <AppHeader title="Journey" subtitle={profile.journeySubtitle} />

      <section className="mb-6 flex flex-col items-center rounded-[18px] bg-app-group px-4 py-5 text-center">
        <Image
          src={profile.avatar}
          alt={profile.name}
          width={96}
          height={96}
          className="size-24 rounded-full object-cover shadow-[0_0_0_3px_var(--app-group),0_0_0_5px_var(--accent)]"
        />
        <h2 className="mt-3 text-[22px] font-bold tracking-tight">{profile.name}</h2>
        <p className="flex items-center gap-1 text-[13.5px] text-app-muted">
          <MapPin className="size-3.5" aria-hidden />
          {profile.role} · {profile.location}
        </p>
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
          {profile.badges.map((b) => (
            <li key={b} className="rounded-full bg-finish/18 px-2.5 py-1 text-[11.5px] font-semibold text-finish-deep dark:text-finish">
              {b}
            </li>
          ))}
        </ul>
      </section>

      <ListGroup header="My story">
        <div className="space-y-3 px-4 py-4 text-[15px] leading-relaxed text-app-secondary">
          {story.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </ListGroup>

      <ListGroup header={`Roots to leaves · ${timeline[0]?.year} → ${timeline.at(-1)?.year}`}>
        <ol className="px-4 py-2">
          {timeline.map((t, i) => (
            <li key={t.year} className="relative flex gap-3 py-2.5">
              {i < timeline.length - 1 && (
                <span aria-hidden className="absolute top-11 bottom-[-6px] left-4 w-px bg-app-divider" />
              )}
              <span className="text-[#2f9e5b]">
                <Plant stage={i} last={i === timeline.length - 1} />
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-[13px] font-bold text-finish-deep tabular-nums dark:text-finish">{t.year}</span>
                <span className="block text-[14.5px] leading-snug">{t.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </ListGroup>

      <ListGroup header="Education">
        <ListRow
          leading={
            <span className="grid size-9 place-items-center rounded-[10px] bg-[#2747e0] text-white">
              <GraduationCap className="size-5" aria-hidden />
            </span>
          }
          title={profile.education}
          subtitle="Engineering"
        />
      </ListGroup>

      <ListGroup header="Highlights">
        <ListRow
          leading={
            <span className="grid size-9 place-items-center rounded-[10px] bg-finish text-finish-ink">
              <Sparkles className="size-5" aria-hidden />
            </span>
          }
          title={profile.highlight.title}
          subtitle={profile.highlight.text}
        />
      </ListGroup>
    </AppScreen>
  );
}
