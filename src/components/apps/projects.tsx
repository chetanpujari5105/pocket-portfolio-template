"use client";

import Image from "next/image";
import { useState } from "react";

import { projects } from "@content/projects";
import type { Project } from "@content/schema";
import {
  AppHeader,
  AppScreen,
  AppNav,
  Chip,
  ChipGroup,
  ListGroup,
  Pill,
  PushView,
  useLastValue,
} from "@/components/ui/app-shell";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";
import { blurOf } from "@/lib/placeholders";

const CATEGORIES = ["All", "Apps", "Games", "Web"] as const;
const featured = projects.find((p) => p.featured) ?? projects[0];

function ProjectIcon({
  project,
  size = 52,
}: {
  project: Project;
  size?: number;
}) {
  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-[23%] shadow-[0_0_0_0.5px_var(--app-divider)]"
      style={{ width: size, height: size, background: project.color }}
    >
      <Image
        src={project.image}
        {...blurOf(project.image)}
        alt=""
        fill
        sizes={`${size}px`}
        className="object-cover object-left-top"
      />
    </span>
  );
}

function ProjectDetail({ id }: { id: string }) {
  const p = projects.find((x) => x.id === id);
  if (!p) return null;
  return (
    <AppScreen>
      <div className="mb-4">
        <AppNav backLabel="Back to Projects" title={p.name} />
      </div>
      <div className="flex items-center gap-3">
        <ProjectIcon project={p} size={72} />
        <div className="min-w-0">
          <h2 className="text-[22px] leading-tight font-bold tracking-tight">
            {p.name}
          </h2>
          <p className="text-[14px] text-app-muted">{p.tagline}</p>
          <Pill
            href={p.url}
            className="mt-2"
            label={`Open ${p.name} (new tab)`}
          >
            Open
          </Pill>
        </div>
      </div>
      <div className="relative mt-5 aspect-[16/10] overflow-hidden rounded-[16px] bg-app-group shadow-[0_0_0_0.5px_var(--app-divider)]">
        <Image
          src={p.image}
          {...blurOf(p.image)}
          alt={`${p.name} screenshot`}
          fill
          sizes="(max-width: 600px) 100vw, 400px"
          className="object-cover"
        />
      </div>
      <p className="mt-5 text-[15.5px] leading-relaxed">{p.description}</p>
      <ListGroup header="Built with" className="mt-5">
        <div className="flex flex-wrap gap-1.5 px-4 py-3">
          {p.stack.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      </ListGroup>
      <p className="px-1 text-[12.5px] text-app-muted">{new URL(p.url).host}</p>
    </AppScreen>
  );
}

export default function ProjectsApp() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const sub = useOS((s) => (s.route.app === "projects" ? s.route.sub : null));
  const shown = useLastValue(sub);
  const list =
    cat === "All" ? projects : projects.filter((p) => p.category === cat);

  return (
    <>
      <AppScreen>
        <AppHeader
          title="Projects"
          subtitle="Apps, games and sites I've built and shipped."
        />

        <ChipGroup
          label="Filter projects"
          className="-mx-4 mb-5 no-scrollbar flex gap-2 overflow-x-auto px-4"
        >
          {CATEGORIES.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
            </Chip>
          ))}
        </ChipGroup>

        {projects.length === 0 && (
          <p className="mt-10 px-6 text-center text-[14.5px] leading-snug text-app-muted">
            Projects are on their way.
          </p>
        )}

        {featured && (cat === "All" || cat === featured.category) && (
          <button
            type="button"
            onClick={() => openApp("projects", featured.id)}
            className="mb-7 block w-full overflow-hidden rounded-[22px] bg-app-group text-left shadow-[0_10px_30px_-14px_rgb(0_0_0/0.35)] transition-transform duration-150 active:scale-[0.98]"
          >
            <span className="relative block aspect-[16/10]">
              <Image
                src={featured.image}
                {...blurOf(featured.image)}
                alt=""
                fill
                sizes="(max-width: 600px) 100vw, 400px"
                className="object-cover"
              />
            </span>
            <span className="flex items-center gap-3 p-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold tracking-wider text-app-muted uppercase">
                  Featured
                </span>
                <span className="block text-[19px] font-bold tracking-tight">
                  {featured.name}
                </span>
                <span className="block text-[13.5px] text-app-muted">
                  {featured.tagline}
                </span>
              </span>
              <span className="rounded-full bg-finish px-4 py-1.5 text-[13.5px] font-bold text-finish-ink">
                View
              </span>
            </span>
          </button>
        )}

        {list.length > 0 && (
          <ListGroup header="Made by me">
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openApp("projects", p.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-app-divider/40"
              >
                <ProjectIcon project={p} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {p.name}
                  </span>
                  <span className="block truncate text-[12.5px] text-app-muted">
                    {p.tagline}
                  </span>
                </span>
                <span className="rounded-full bg-app-background px-3.5 py-1 text-[13px] font-bold text-finish-deep dark:text-finish">
                  View
                </span>
              </button>
            ))}
          </ListGroup>
        )}
      </AppScreen>

      <PushView open={!!sub} label="Project details">
        {shown && <ProjectDetail id={shown} />}
      </PushView>
    </>
  );
}
