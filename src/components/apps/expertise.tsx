"use client";

import Image from "next/image";

import { courses } from "@content/courses";
import { expertise } from "@content/expertise";
import type { Expertise } from "@content/schema";
import { services } from "@content/services";
import { ExpertiseTile } from "@/components/apps/expertise-tile";
import { ServiceTile } from "@/components/apps/service-tile";
import { AppHeader, AppScreen, PushView, useLastValue } from "@/components/ui/app-shell";
import { Row, Section } from "@/components/ui/grouped";
import { blurOf } from "@/lib/placeholders";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";

/*
 * Expertise, laid out like Settings: one inset-grouped list (a tile, the area and every tool in it),
 * each row pushing a detail with its tools and the courses and services that go with it. Every word
 * comes from content/expertise.ts, content/courses.ts and content/services.ts.
 */

function AreaDetail({ area }: { area: Expertise }) {
  const relCourses = courses.filter((c) => area.relatedCourses.includes(c.id));
  const relServices = services.filter((s) => area.relatedServices.includes(s.id));
  return (
    <AppScreen>
      <AppHeader title={area.title} backLabel="Back to Expertise" />

      <Section header="Tools and skills" inset={16}>
        {area.tools.map((t) => (
          <Row key={t} title={t} />
        ))}
      </Section>

      {relCourses.length > 0 && (
        <Section header="Related courses" inset={92}>
          {relCourses.map((c) => (
            <Row
              key={c.id}
              leading={
                <span aria-hidden className="relative block h-9 w-16 shrink-0 overflow-hidden rounded-ios-s">
                  <Image src={c.image} {...blurOf(c.image)} alt="" fill sizes="64px" className="object-cover" />
                </span>
              }
              title={c.title}
              onPush={() => openApp("courses", c.id)}
              data={{ "data-related-course": c.id }}
            />
          ))}
        </Section>
      )}

      {relServices.length > 0 && (
        <Section header="Related services">
          {relServices.map((s) => (
            <Row
              key={s.id}
              leading={<ServiceTile id={s.id} />}
              title={s.title}
              onPush={() => openApp("services", s.id)}
              data={{ "data-related-service": s.id }}
            />
          ))}
        </Section>
      )}
    </AppScreen>
  );
}

export default function ExpertiseApp() {
  const sub = useOS((s) => (s.route.app === "expertise" ? s.route.sub : null));
  const shown = useLastValue(sub);
  const detail = expertise.find((e) => e.id === shown);
  return (
    <>
      <AppScreen>
        <AppHeader title="Expertise" subtitle="What I bring to the table." />
        <Section label="Areas of expertise">
          {expertise.map((e) => (
            <Row
              key={e.id}
              leading={<ExpertiseTile id={e.id} />}
              title={e.title}
              secondary={e.tools.join(", ")}
              onPush={() => openApp("expertise", e.id)}
              data={{ "data-area-row": e.id }}
            />
          ))}
        </Section>
      </AppScreen>
      <PushView open={!!sub && !!expertise.find((e) => e.id === sub)} label="Expertise details">
        {detail && <AreaDetail area={detail} />}
      </PushView>
    </>
  );
}
