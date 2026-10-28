"use client";

import { useEffect, useState } from "react";

import { useOS } from "@/lib/store";
import { cn } from "@/lib/utils";

function formatTime(d: Date) {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Live local clock — updates on the minute. */
function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const now = new Date();
      setTime(formatTime(now));
      timer = window.setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <time suppressHydrationWarning className="tabular-nums">
      {time}
    </time>
  );
}

/** Status bar drawn inside the phone (hidden on real phones, which have their own). */
export function StatusBar({ onApp }: { onApp: boolean }) {
  // Edit mode: like iOS, the status bar steps aside for the Done and + pills
  const editing = useOS((s) => s.wiggle);
  return (
    <div
      className={cn(
        editing && !onApp && "opacity-0",
        // Centred on the cutout's midline; time and indicators each centred in their "ear" beside it
        "pointer-events-none absolute inset-x-0 top-0 z-70 hidden h-[calc(var(--phone-h)*0.0563)] grid-cols-[1fr_30%_1fr] items-center px-[3cqw] font-[system-ui,-apple-system,sans-serif] text-[clamp(13px,4.1cqw,16px)] font-semibold tracking-[-0.01em] transition-colors duration-200 tab:grid",
        onApp ? "text-app-ink" : "text-white",
      )}
      aria-hidden
    >
      <span className="flex justify-center pl-[2cqw]">
        <Clock />
      </span>
      <span />
      <span className="flex items-center justify-center gap-[5px] pr-[1cqw]">
        <svg viewBox="0 0 18 12" className="h-[11px]" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" className="h-[11px]" fill="currentColor">
          <path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.6 10.6 0 0 0 8 .4C5.2.4 2.5 1.5.5 3.4l1.2 1.3A9 9 0 0 1 8 2.2Z" />
          <path d="M8 5.6c1.5 0 2.9.6 3.9 1.5l1.2-1.3A7.4 7.4 0 0 0 8 3.8c-1.9 0-3.7.7-5.1 2l1.2 1.3c1-.9 2.4-1.5 3.9-1.5Z" />
          <path d="M8 9c.6 0 1.1.2 1.5.6L8 11.3 6.5 9.6c.4-.4.9-.6 1.5-.6Z" />
        </svg>
        <svg viewBox="0 0 27 13" className="h-[12px]" fill="none">
          <rect x=".5" y=".5" width="23" height="12" rx="3.6" stroke="currentColor" opacity=".4" />
          <rect x="2.2" y="2.2" width="17.5" height="8.6" rx="2.2" fill="currentColor" />
          <path d="M25 4.4v4.2c.8-.3 1.4-1.1 1.4-2.1S25.8 4.7 25 4.4Z" fill="currentColor" opacity=".45" />
        </svg>
      </span>
    </div>
  );
}
