import { PHONE_QUERY } from "./theme";

/*
 * The browser's own bar (theme-color) blends into whatever touches it: on a phone, the wallpaper's
 * top edge (sampled by the shader) or the open app's background; around the drawn phone, the studio.
 */

let wallpaperTop = "#0b0b0d";
let appBackground: string | null = null;

function apply() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) return;
  const root = getComputedStyle(document.documentElement);
  const color = window.matchMedia(PHONE_QUERY).matches
    ? (appBackground ?? wallpaperTop)
    : root.getPropertyValue("--studio-bg").trim() || "#fafafa";
  if (meta.content !== color) meta.content = color;
}

/** Average colour along the wallpaper's top edge, `[r, g, b]` 0–255. */
export function setWallpaperTop([r, g, b]: number[]) {
  wallpaperTop = `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
  apply();
}

/** The open app's background, or null on the home and lock screens. */
export function setAppBackground(color: string | null) {
  appBackground = color;
  apply();
}

export const refreshThemeColor = apply;
