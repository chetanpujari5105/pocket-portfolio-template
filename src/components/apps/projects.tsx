"use client";

import Image from "next/image";
import { useState } from "react";

import { projects } from "@content/projects";
import type { Project } from "@content/schema";
import { AppHeader, AppScreen, PushView, Segmented, useLastValue } from "@/components/ui/app-shell";
import { Row, Section } from "@/components/ui/grouped";
import { blurOf } from "@/lib/placeholders";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";

/*
 * Projects, laid out like Settings: a segmented control to filter, the featured project as
 * a card, then one inset-grouped list (the app's icon, its name and tagline), each row pushing a
 * detail with its status, what it's built with and its link. Every word comes from content/projects.ts.
 */

const CATEGORIES = ["All", "Apps", "Games", "Web"] as const;
type Category = (typeof CATEGORIES)[number];
const featured = projects.find((p) => p.featured) ?? projects[0];

function ProjectIcon({ project, size = 44 }: { project: Project; size?: number }) {
  return (
    <span
      aria-hidden
      className="relative shrink-0 overflow-hidden rounded-[23%] shadow-[0_0_0_0.5px_var(--app-divider)]"
      style={{ width: size, height: size, background: project.color }}
    >
      <Image src={project.image} {...blurOf(project.image)} alt="" fill sizes={`${size}px`} className="object-cover object-left-top" />
    </span>
  );
}

function ProjectDetail({ project: p }: { project: Project }) {
  return (
    <AppScreen>
      <AppHeader title={p.name} backLabel="Back to Projects" subtitle={p.tagline} />

      <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-ios-xl bg-app-group shadow-[0_0_0_0.5px_var(--app-divider)]">
        <Image src={p.image} {...blurOf(p.image)} alt={`${p.name} screenshot`} fill sizes="(max-width: 600px) 100vw, 400px" className="object-cover" />
      </div>

      <p className="mb-6 text-ios-body">{p.description}</p>

      {p.status && (
        <Section header="Status" inset={16}>
          <Row title={p.status} data={{ "data-project-status": "" }} />
        </Section>
      )}

      <Section header="Built with" inset={16}>
        {p.stack.map((s) => (
          <Row key={s} title={s} />
        ))}
      </Section>

      {p.url && (
        <Section label="Link" inset={16}>
          <Row
            title={`Open ${p.name}`}
            secondary={new URL(p.url).host}
            href={p.url}
            label={`Open ${p.name} (opens in a new tab)`}
            data={{ "data-project-link": "" }}
          />
        </Section>
      )}
    </AppScreen>
  );
}

export default function ProjectsApp() {
  const [cat, setCat] = useState<Category>("All");
  const sub = useOS((s) => (s.route.app === "projects" ? s.route.sub : null));
  const shown = useLastValue(sub);
  const detail = projects.find((p) => p.id === shown);
  const list = cat === "All" ? projects : projects.filter((p) => p.category === cat);

  return (
    <>
      <AppScreen>
        <AppHeader title="Projects" subtitle="Apps, games and sites I've built and shipped." />

        <div className="mb-5">
          <Segmented label="Filter projects" options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={cat} onChange={setCat} />
        </div>

        {(cat === "All" || cat === featured.category) && (
          <Section header="Featured" inset={16}>
            <button
              type="button"
              onClick={() => openApp("projects", featured.id)}
              aria-label={`${featured.name}, featured, details`}
              data-project-featured
              className="block w-full text-left transition-colors duration-150 active:bg-ios-fill-tertiary [@media(hover:hover)]:hover:bg-ios-fill-quaternary"
            >
              <span aria-hidden className="relative block aspect-[16/10]">
                <Image src={featured.image} {...blurOf(featured.image)} alt="" fill sizes="(max-width: 600px) 100vw, 400px" className="object-cover" />
              </span>
              <span className="block px-4 pt-3 pb-4">
                <span className="block text-ios-title-3 font-semibold">{featured.name}</span>
                <span className="mt-0.5 block text-ios-subheadline text-app-muted">{featured.tagline}</span>
              </span>
            </button>
          </Section>
        )}

        <Section header="Made by me" inset={72}>
          {list.map((p) => (
            <Row
              key={p.id}
              leading={<ProjectIcon project={p} />}
              title={p.name}
              secondary={p.tagline}
              onPush={() => openApp("projects", p.id)}
              data={{ "data-project-row": p.id }}
            />
          ))}
        </Section>
      </AppScreen>

      <PushView open={!!sub && !!projects.find((p) => p.id === sub)} label="Project details">
        {detail && <ProjectDetail project={detail} />}
      </PushView>
    </>
  );
}
