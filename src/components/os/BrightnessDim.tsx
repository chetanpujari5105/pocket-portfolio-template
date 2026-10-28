"use client";

import { useOS } from "@/lib/store";

/** Screen brightness from Control Center: a dimming layer over everything on the screen. */
export function BrightnessDim() {
  const brightness = useOS((s) => s.brightness);
  if (brightness >= 1) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[79] bg-black"
      style={{ opacity: (1 - brightness) * 0.75 }}
    />
  );
}
