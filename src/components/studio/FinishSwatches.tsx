"use client";

import { FINISHES, applyFinish, type Finish } from "@/lib/theme";
import { onRadioGroupKeyDown } from "@/lib/a11y";
import { useOS } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * `color`/`deep`: the UI accent (wallpaper, highlights). `frame`/`back`: the anodized metal of the
 * device itself, less saturated than the accent so it reads as metal, not plastic.
 * Electric → cosmic orange-gold, Graphite → space black, Chai → warm desert titanium.
 */
export const FINISH_INFO: Record<Finish, { label: string; color: string; deep: string; frame: string; back: string }> = {
  electric: { label: "Electric", color: "#ffb800", deep: "#c98a00", frame: "#cc7538", back: "#d0824c" },
  graphite: { label: "Graphite", color: "#8a8f98", deep: "#4a4e55", frame: "#3b3c40", back: "#2c2d31" },
  chai: { label: "Chai", color: "#b9783f", deep: "#7a4a22", frame: "#b79d83", back: "#c1a88f" },
};

export function useSetFinish() {
  const setFinish = useOS((s) => s.setFinish);
  return (finish: Finish) => {
    applyFinish(finish);
    setFinish(finish);
  };
}

export function FinishSwatches({ className }: { className?: string }) {
  const finish = useOS((s) => s.finish);
  const set = useSetFinish();
  return (
    <div role="radiogroup" aria-label="Phone finish" onKeyDown={onRadioGroupKeyDown} className={cn(className ?? "flex", "items-center gap-3")}>
      {FINISHES.map((f) => (
        <button
          key={f}
          type="button"
          role="radio"
          aria-checked={finish === f}
          tabIndex={finish === f ? 0 : -1}
          aria-label={FINISH_INFO[f].label}
          title={FINISH_INFO[f].label}
          onClick={() => set(f)}
          className={cn(
            "size-7 rounded-full transition-[transform,box-shadow] duration-150 ease-out active:scale-90",
            finish === f
              ? "shadow-[0_0_0_2px_var(--studio-bg),0_0_0_3.5px_var(--studio-ink)]"
              : "shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]",
          )}
          // The swatch is the device's metal: a lit edge, the anodized colour, a shaded edge
          style={{
            background: `linear-gradient(150deg, color-mix(in oklab, ${FINISH_INFO[f].frame}, #fff 38%), ${FINISH_INFO[f].frame} 45%, color-mix(in oklab, ${FINISH_INFO[f].frame}, #000 32%))`,
          }}
        />
      ))}
    </div>
  );
}
