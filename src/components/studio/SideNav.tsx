"use client";

import { profile } from "@content/profile";
import type { AppId } from "@content/schema";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";
import { cn } from "@/lib/utils";

const LINKS: { app: AppId; label: string }[] = [
  { app: "courses", label: "Courses" },
  { app: "journey", label: "Journey" },
  { app: "contact", label: "Contact" },
];

/** Desktop: right column beside the phone. Tablet: horizontal bar under it. Phone: hidden. */
export function SideNav() {
  const active = useOS((s) => s.route.app);
  return (
    <aside className="hidden tab:flex tab:w-full tab:max-w-[560px] tab:items-center tab:justify-between tab:gap-4 desk:absolute desk:z-10 desk:top-1/2 desk:right-[6vw] desk:w-auto desk:max-w-none desk:-translate-y-1/2 desk:flex-col desk:items-end desk:gap-0 desk:text-right">
      <div className="desk:mb-9">
        <p className="font-display text-[22px] leading-[0.9] font-extrabold tracking-[-0.01em] [font-stretch:125%] desk:text-[clamp(2.6rem,4.6vw,4.4rem)]">
          <span className="desk:block">{profile.firstName} </span>
          <span className="desk:block">
            {profile.lastName}
            <span className="text-finish">⚡</span>
          </span>
        </p>
        <p className="mt-3 hidden text-[15px] text-studio-muted desk:block">
          {profile.sideLine}
        </p>
      </div>
      <nav aria-label="Open on the phone" className="flex gap-5 desk:flex-col desk:items-end desk:gap-3.5">
        {LINKS.map((l) => (
          <button
            key={l.app}
            type="button"
            onClick={() => openApp(l.app)}
            aria-current={active === l.app ? "page" : undefined}
            className={cn(
              "text-[15px] font-semibold transition-colors duration-150 desk:text-[21px]",
              active === l.app ? "text-studio-ink" : "text-studio-muted hover:text-studio-ink",
            )}
          >
            {l.label}
          </button>
        ))}
      </nav>
      <p className="hidden items-center gap-2 rounded-full border border-studio-line px-3 py-1.5 text-[13px] font-medium desk:mt-10 desk:inline-flex">
        <span className="size-2 rounded-full bg-available shadow-[0_0_0_3px_color-mix(in_oklab,var(--available)_25%,transparent)]" />
        {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
      </p>
    </aside>
  );
}
