"use client";

import Image from "next/image";

import { courses } from "@content/courses";
import { expertise } from "@content/expertise";
import { services } from "@content/services";
import { AppHeader, AppScreen, ListGroup, ListRow, Sheet, useLastValue } from "@/components/ui/app-shell";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";
import { blurOf } from "@/lib/placeholders";

function AreaSheet({ id }: { id: string }) {
  const area = expertise.find((e) => e.id === id);
  if (!area) return null;
  const relCourses = courses.filter((c) => area.relatedCourses.includes(c.id));
  const relServices = services.filter((s) => area.relatedServices.includes(s.id));
  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <span aria-hidden className="grid size-12 place-items-center rounded-[14px] bg-app-group text-[26px]">
          {area.emoji}
        </span>
        <h2 className="text-[21px] leading-tight font-bold tracking-tight">{area.title}</h2>
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {area.tools.map((t) => (
          <span key={t} className="rounded-full bg-app-group px-2.5 py-1 text-[12.5px] font-medium text-app-secondary">
            {t}
          </span>
        ))}
      </div>
      {relCourses.length > 0 && (
        <ListGroup header="Related courses">
          {relCourses.map((c) => (
            <ListRow
              key={c.id}
              chevron
              onClick={() => openApp("courses", c.id)}
              leading={
                <span className="relative block h-9 w-14 overflow-hidden rounded-[8px]">
                  <Image src={c.image} {...blurOf(c.image)} alt="" fill sizes="56px" className="object-cover" />
                </span>
              }
              title={<span className="line-clamp-2 text-[14px]">{c.title}</span>}
              subtitle={c.badge}
            />
          ))}
        </ListGroup>
      )}
      {relServices.length > 0 && (
        <ListGroup header="Related services">
          {relServices.map((s) => (
            <ListRow
              key={s.id}
              chevron
              onClick={() => openApp("services")}
              leading={<span aria-hidden className="text-[20px]">{s.emoji}</span>}
              title={s.title}
            />
          ))}
        </ListGroup>
      )}
    </>
  );
}

export default function ExpertiseApp() {
  const sub = useOS((s) => (s.route.app === "expertise" ? s.route.sub : null));
  const shown = useLastValue(sub);
  return (
    <>
      <AppScreen>
        <AppHeader title="Expertise" subtitle="What I bring to the table." />
        <ul className="grid grid-cols-2 gap-3">
          {expertise.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => openApp("expertise", e.id)}
                className="flex h-full w-full flex-col rounded-[18px] bg-app-group p-3.5 text-left transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                <span aria-hidden className="text-[26px] leading-none">
                  {e.emoji}
                </span>
                <span className="mt-2.5 text-[14.5px] leading-snug font-bold tracking-tight">{e.title}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {e.tools.slice(0, 3).map((t) => (
                    <span key={t} className="max-w-full truncate rounded-full bg-app-background px-2 py-[3px] text-[10.5px] font-medium text-app-muted">
                      {t}
                    </span>
                  ))}
                  {e.tools.length > 3 && (
                    <span className="px-1 py-[3px] text-[10.5px] font-medium text-app-muted">+{e.tools.length - 3}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </AppScreen>
      <Sheet open={!!sub} label="Expertise details">
        {shown && <AreaSheet id={shown} />}
      </Sheet>
    </>
  );
}
