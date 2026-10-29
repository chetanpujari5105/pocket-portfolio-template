"use client";

import { useEffect, useRef, useState } from "react";
import { useTransform } from "motion/react";
import * as m from "motion/react-m";

import { HOME_SCALE_OPEN, unlockProgress, useRecede } from "@/lib/motion";
import { prefersReducedMotion, useOS } from "@/lib/store";

/*
 * Original animated wallpapers drawn with one small fragment shader.
 * - ribbons: glossy flowing bands in the finish colour
 * - aurora:  soft drifting light over a deep backdrop
 * - dusk:    calm vertical gradient with a slow sheen
 * Renders at reduced resolution, ~30fps, pauses when hidden, and draws a single
 * still frame under reduced motion. Falls back to CSS when WebGL is missing. The renderer
 * itself (shader, GL setup, loop) is in wallpaper-gl.ts, loaded at the first idle moment.
 */

export function Wallpaper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wallpaper = useOS((s) => s.wallpaper);
  const reduceMotion = useOS((s) => s.reduceMotion);
  const [failed, setFailed] = useState(false);
  // Recedes with the home screen while an app opens
  const recede = useRecede();
  const transform = useTransform(recede, (r) => (r < 0.001 ? "none" : `scale(${1 - (1 - HOME_SCALE_OPEN) * r})`));
  // Unlocking: the wallpaper softens as the lock screen lifts and clears again under the home screen
  const filter = useTransform(unlockProgress, (p) =>
    p <= 0 || p >= 1 || prefersReducedMotion() ? "none" : `blur(${(Math.sin(Math.PI * p) * 14).toFixed(1)}px) brightness(${1 - Math.sin(Math.PI * p) * 0.12})`,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let cleanup = () => {};

    // Wait for an idle moment after first paint so shader work never competes with hydration
    const idle =
      window.requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 300));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const idleId = idle(() => {
      void import("./wallpaper-gl").then(({ startWallpaper }) => {
        if (!cancelled) cleanup = startWallpaper(canvas, wallpaper, () => setFailed(true));
      });
    });

    return () => {
      cancelled = true;
      cancelIdle(idleId);
      cleanup();
    };
  }, [wallpaper, reduceMotion]);

  return (
    <m.div
      aria-hidden
      style={{ transform, filter }}
      className="absolute inset-0 overflow-hidden bg-finish-deep"
    >
      {/* The CSS gradient shows until the shader's first frame, and stays if WebGL fails */}
      <div
        className="wallpaper-fallback absolute inset-0"
        data-variant={wallpaper}
      />
      {!failed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full opacity-0 transition-opacity duration-500 data-ready:opacity-100"
        />
      )}
    </m.div>
  );
}
