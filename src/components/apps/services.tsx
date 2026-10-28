"use client";

import { philosophy } from "@content/philosophy";
import { services, servicesIntro, servicesTitle } from "@content/services";
import { AppHeader, AppScreen, Pill, SectionTitle } from "@/components/ui/app-shell";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";

function letsTalk(subject: string) {
  useOS.getState().setContactSubject(subject);
  openApp("contact");
}

export default function ServicesApp() {
  return (
    <AppScreen>
      <AppHeader title={servicesTitle} subtitle={servicesIntro} />

      <ul className="mb-6 space-y-3">
        {services.map((s) => (
          <li key={s.id} className="rounded-[18px] bg-app-group p-4">
            <div className="flex items-start gap-3">
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-app-background text-[24px]">
                {s.emoji}
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] leading-snug font-bold tracking-tight">{s.title}</h2>
                <p className="mt-1 text-[14px] leading-relaxed text-app-secondary">{s.description}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Pill onClick={() => letsTalk(s.subject)} label={`Let's talk about: ${s.title}`}>
                Let&apos;s talk
              </Pill>
            </div>
          </li>
        ))}
      </ul>

      <SectionTitle>Why people trust me</SectionTitle>
      <ul className="space-y-2">
        {philosophy.map((p) => (
          <li key={p.quote} className="flex gap-3 rounded-[14px] bg-app-group px-4 py-3">
            <span aria-hidden className="text-[20px] leading-none">
              {p.emoji}
            </span>
            <blockquote className="border-l-2 border-finish pl-3 text-[14.5px] leading-snug italic">
              {p.quote}
            </blockquote>
          </li>
        ))}
      </ul>
    </AppScreen>
  );
}
