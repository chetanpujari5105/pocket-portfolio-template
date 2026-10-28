"use client";

import { useLayoutEffect, useMemo, useState, type RefObject } from "react";

import { homeGeometry, paginate, type Insets } from "@/lib/home";
import { useOS } from "@/lib/store";
import { PHONE_QUERY } from "@/lib/theme";

/** Safe-area insets in px, read through a probe that pads itself with env(). */
function readInsets(host: HTMLElement): Insets {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  host.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/**
 * The home screen fitted to the space it actually gets: measures the screen (and its safe
 * areas) whenever it changes size, from browser toolbars showing to rotation or the keyboard,
 * then works out columns, icon size and rows (lib/home.ts `homeGeometry`) and flows the
 * visitor's grid across as many pages as it needs.
 */
export function useHomeLayout(screenRef: RefObject<HTMLElement | null>) {
  const geo = useOS((s) => s.homeGeo);
  // Mid-drag, the grid as it would be if the icon were dropped now
  const grid = useOS((s) => s.homePreview?.grid ?? s.home.grid);
  // The server can't know the screen: the grid stays hidden until the first measure (before paint)
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;
    let last = "";
    const measure = () => {
      const W = screen.clientWidth;
      const H = screen.clientHeight;
      if (!W || !H) return;
      const framed = !window.matchMedia(PHONE_QUERY).matches;
      const insets = framed ? { top: 0, right: 0, bottom: 0, left: 0 } : readInsets(screen);
      const key = `${W}x${H}:${framed}:${insets.top},${insets.right},${insets.bottom},${insets.left}`;
      if (key === last) return;
      last = key;
      useOS.getState().setHomeGeo(homeGeometry(W, H, insets, framed));
      setMeasured(true);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(screen);
    return () => ro.disconnect();
  }, [screenRef]);

  const flow = useMemo(() => paginate(grid, geo.cols, geo.rows), [grid, geo.cols, geo.rows]);
  return { geo, ...flow, measured };
}
