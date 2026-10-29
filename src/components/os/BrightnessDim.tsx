"use client";

import { useOS } from "@/lib/store";

/**
 * Screen brightness from Control Center: a dimming layer over everything on the screen. The
 * lock-screen flashlight lifts it instead: a soft-light wash that brightens without washing out.
 */
export function BrightnessDim() {
  const brightness = useOS((s) => s.brightness);
  const torch = useOS((s) => s.torch);
  if (torch)
    return (
      <div
        aria-hidden
        data-torch
        className="pointer-events-none absolute inset-0 z-[79] bg-[radial-gradient(120%_70%_at_50%_0%,#fff,rgb(255_255_255/0.55))] opacity-45 mix-blend-soft-light"
      />
    );
  if (brightness >= 1) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[79] bg-black"
      style={{ opacity: (1 - brightness) * 0.75 }}
    />
  );
}
