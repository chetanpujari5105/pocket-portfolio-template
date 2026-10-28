"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  FINISHES,
  FINISH_KEY,
  THEME_KEY,
  applyFinish,
  currentTheme,
  readStored,
  setThemeWithReveal,
} from "@/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

export function useTheme() {
  return useSyncExternalStore(subscribe, currentTheme, () => "light" as const);
}

/**
 * Dev-only safety net: React's Strict Mode remount resets <html> attributes
 * set by the inline head script. Re-apply them before paint (no-op in prod).
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    const theme = readStored(THEME_KEY, ["light", "dark"] as const);
    if (theme) document.documentElement.classList.toggle("dark", theme === "dark");
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches)
      document.documentElement.classList.add("dark");
    const finish = readStored(FINISH_KEY, FINISHES);
    if (finish) applyFinish(finish);
  }, []);
  return null;
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label="Dark mode"
      aria-pressed={isDark}
      suppressHydrationWarning
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setThemeWithReveal(isDark ? "light" : "dark", {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }}
      className={cn(
        // Position and display come from the caller when it places the button
        className ?? "relative grid",
        "size-10 place-items-center rounded-full border border-studio-line text-studio-ink transition-transform duration-150 ease-out active:scale-[0.94]",
      )}
    >
      {/* Both glyphs render; CSS picks one so there's no flash before hydration */}
      <Zap className="size-[18px] fill-finish stroke-finish-deep dark:hidden" aria-hidden />
      <Moon className="hidden size-[18px] dark:block" aria-hidden />
    </button>
  );
}
