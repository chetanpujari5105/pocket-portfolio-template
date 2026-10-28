"use client";

import { memo, useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { Check, Link2, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ui/theme-toggle";
import { springs } from "@/lib/motion";
import { useOS, type PillEvent } from "@/lib/store";
import { currentTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function PillIcon({ pill }: { pill: PillEvent }) {
  if (pill.kind === "progress")
    return (
      <svg aria-hidden viewBox="0 0 20 20" className="size-[18px] shrink-0 animate-spin text-finish">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2.6" />
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="14 50" />
      </svg>
    );
  const Icon = pill.icon === "moon" ? Moon : pill.icon === "sun" ? Sun : pill.icon === "link" ? Link2 : Check;
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-[20px] shrink-0 place-items-center rounded-full",
        pill.kind === "done" ? "bg-available text-white" : "bg-white/15 text-white",
      )}
    >
      <Icon className="size-[12px]" strokeWidth={3} />
    </span>
  );
}

/**
 * The camera cutout doubles as a status pill: it grows sideways to say what just happened
 * ("Message sent", "Link copied", "Theme: Dark", a refresh ring) and shrinks back. Tap collapses it.
 * Screen readers hear the same text from a polite live region.
 */
// Memoised (Phone re-renders on every route change). The pill grows with a CSS transition rather
// than a Motion `layout` animation: Motion re-measures layout nodes whenever its tree updates,
// which forced a full layout in the frame after every app launch.
export const StatusPill = memo(function StatusPill() {
  const pill = useOS((s) => s.pill);
  const hidePill = useOS((s) => s.hidePill);
  // The last message stays rendered while the pill shrinks, so it can fade out
  const [last, setLast] = useState<PillEvent | null>(pill);
  if (pill && pill !== last) setLast(pill);
  const shown = pill ?? last;
  const theme = useTheme();
  const lastTheme = useRef<string | null>(null);

  // Announce theme switches from anywhere (Control Center, Settings, the studio toggle)
  useEffect(() => {
    if (lastTheme.current === null) {
      lastTheme.current = currentTheme();
      return;
    }
    if (theme === lastTheme.current) return;
    lastTheme.current = theme;
    useOS.getState().showPill("info", `Theme: ${theme === "dark" ? "Dark" : "Light"}`, theme === "dark" ? "moon" : "sun");
  }, [theme]);

  return (
    <>
      <button
        type="button"
        tabIndex={pill ? 0 : -1}
        aria-hidden={!pill}
        aria-label={pill ? `${pill.text}. Dismiss` : undefined}
        onClick={() => hidePill()}
        data-pill={pill?.kind}
        style={{ borderRadius: 999 }}
        className={cn("status-pill", pill && "status-pill-open")}
      >
        {shown && (
          <m.span
            key={shown.id}
            initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            animate={
              pill
                ? { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...springs.snappy, delay: 0.06 } }
                : { opacity: 0, scale: 0.9, filter: "blur(4px)", transition: { duration: 0.12 } }
            }
            className="flex min-w-0 items-center gap-2 px-3.5 text-[13.5px] font-semibold whitespace-nowrap text-white"
          >
            <PillIcon pill={shown} />
            <span className="truncate">{shown.text}</span>
          </m.span>
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {pill?.text ?? ""}
      </span>
    </>
  );
});
