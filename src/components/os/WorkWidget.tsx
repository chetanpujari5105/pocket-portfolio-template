"use client";

import { services } from "@content/services";
import { openApp } from "@/lib/router";

const CHIPS = services.flatMap((s) => (s.chip ? [s.chip] : []));

export function WorkWidget() {
  return (
    <button
      type="button"
      data-nav
      data-app-icon="services-widget"
      onClick={() => openApp("services")}
      aria-label={`Work with me: ${CHIPS.join(", ")}. Open Services`}
      className="icon-press col-span-2 row-span-2 flex h-full flex-col items-center gap-[5px] select-none"
    >
      <span className="wiggle-item flex min-h-0 w-full flex-1 flex-col justify-between overflow-hidden widget-r bg-app-surface p-3 text-left text-app-ink shadow-[0_4px_14px_rgb(0_0_0/0.18)] transition-transform duration-150 ease-out [.icon-press:active_&]:scale-[0.96]">
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-available uppercase">
          <span className="size-[6px] rounded-full bg-available" />
          Available
        </span>
        <span className="text-[clamp(16px,5.2cqw,20px)] leading-[1.05] font-bold tracking-tight">
          Work
          <br />
          with me
        </span>
        <span className="flex flex-wrap gap-1">
          {CHIPS.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-app-background px-[6px] py-[2.5px] text-[9px] font-semibold whitespace-nowrap text-app-secondary"
            >
              {chip}
            </span>
          ))}
        </span>
      </span>
      <span className="icon-label">Services</span>
    </button>
  );
}
