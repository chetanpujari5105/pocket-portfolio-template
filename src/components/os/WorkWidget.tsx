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
      className="icon-press flex size-full flex-col items-center gap-[calc(var(--icon)*0.11)] select-none"
    >
      <span
        data-widget-tile
        className="wiggle-item [container-type:size] flex min-h-0 w-full flex-1 flex-col justify-between overflow-hidden widget-r widget-light p-[clamp(10px,8.4cqw,14px)] text-left transition-transform duration-150 ease-out [.icon-press:active_&]:scale-[0.96]"
      >
        <span className="flex items-center gap-1.5 text-[clamp(8.5px,5.6cqw,9.5px)] font-semibold tracking-[0.04em] text-available uppercase">
          <span className="size-[6px] rounded-full bg-available" />
          Available
        </span>
        <span className="text-[clamp(17px,min(14.6cqw,15cqh),24px)] leading-[1.02] font-bold tracking-[-0.035em]">
          Work
          <br />
          with me
        </span>
        <span className="flex max-h-[34cqh] flex-wrap gap-1 overflow-hidden">
          {CHIPS.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-app-background px-[7px] py-[3px] text-[clamp(8.5px,5.6cqw,10px)] font-medium whitespace-nowrap text-app-secondary"
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
