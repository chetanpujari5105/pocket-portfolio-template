/**
 * System tokens for the apps inside the phone: plain values, written by hand. The values follow
 * Apple's published Human Interface Guidelines (system colours, Dynamic Type at the Large size,
 * standard metrics). This map and the `--ios-*` variables in app/globals.css are the one place
 * these live: CSS reads the variables (light/dark switch with `.dark`), and script that needs a
 * value (a tint in an SVG, a spring target) reads this map. The type ramp uses the site's own font.
 */

type Mode = { light: string; dark: string };

export const iosColor = {
  "label-primary": { light: "#000000", dark: "#ffffff" },
  "label-secondary": { light: "#3c3c4399", dark: "#ebebf599" },
  "label-tertiary": { light: "#3c3c434d", dark: "#ebebf54d" },
  "label-quaternary": { light: "#3c3c432e", dark: "#ebebf529" },
  /** Text links (kept apart from `blue`, the accent) */
  "label-link": { light: "#007aff", dark: "#0984ff" },
  "bg-primary": { light: "#ffffff", dark: "#000000" },
  "bg-secondary": { light: "#f2f2f7", dark: "#1c1c1e" },
  "bg-grouped-primary": { light: "#f2f2f7", dark: "#000000" },
  "bg-grouped-secondary": { light: "#ffffff", dark: "#1c1c1e" },
  "bg-grouped-tertiary": { light: "#f2f2f7", dark: "#2c2c2e" },
  "bg-grouped-secondary-elevated": { light: "#ffffff", dark: "#2c2c2e" },
  "fill-primary": { light: "#78788033", dark: "#7878805c" },
  "fill-secondary": { light: "#78788029", dark: "#78788052" },
  "fill-tertiary": { light: "#7676801f", dark: "#7676803d" },
  "fill-quaternary": { light: "#74748014", dark: "#7676802e" },
  "fill-vibrant-primary": { light: "#cccccc", dark: "#333333" },
  "separator-opaque": { light: "#e7e7e8", dark: "#2a2a2c" },
  "separator-non-opaque": { light: "#3c3c431f", dark: "#54545880" },
  gray: { light: "#8e8e93", dark: "#8e8e93" },
  "gray-2": { light: "#aeaeb2", dark: "#636366" },
  "gray-3": { light: "#c7c7cc", dark: "#48484a" },
  "gray-4": { light: "#d1d1d6", dark: "#3a3a3c" },
  "gray-5": { light: "#e5e5ea", dark: "#2c2c2e" },
  "gray-6": { light: "#f2f2f7", dark: "#1c1c1e" },
  blue: { light: "#0088ff", dark: "#0091ff" },
  red: { light: "#ff383c", dark: "#ff4245" },
  green: { light: "#34c759", dark: "#30d158" },
  orange: { light: "#ff8d28", dark: "#ff9230" },
  yellow: { light: "#ffcc00", dark: "#ffd600" },
  cyan: { light: "#00c0e8", dark: "#3cd3fe" },
  pink: { light: "#ff2d55", dark: "#ff375f" },
  purple: { light: "#cb30e0", dark: "#db34f2" },
  teal: { light: "#00c3d0", dark: "#00d2e0" },
  indigo: { light: "#6155f5", dark: "#6d7cff" },
  mint: { light: "#00c8b3", dark: "#00dac3" },
  brown: { light: "#ac7f5e", dark: "#b78a66" },
  overlay: { light: "#00000033", dark: "#0000007a" },
  "segmented-selected": { light: "#ffffff", dark: "#636366" },
  "destructive-bg": { light: "#ff383c24", dark: "#ff424524" },
  "scroll-edge": { light: "#ffffffd9", dark: "#0000008c" },
  "scroll-edge-hairline": { light: "#0000000d", dark: "#0000001a" },
} satisfies Record<string, Mode>;

export type IosColor = keyof typeof iosColor;

/** Dynamic Type at the default (Large) size: [size, line height, tracking] in px, plus weight. */
export const iosType = {
  "large-title": { size: 34, line: 41, tracking: 0.4, weight: 700 },
  "title-1": { size: 28, line: 34, tracking: 0.38, weight: 400 },
  "title-2": { size: 22, line: 28, tracking: -0.26, weight: 700 },
  "title-3": { size: 20, line: 25, tracking: -0.45, weight: 600 },
  headline: { size: 17, line: 22, tracking: -0.43, weight: 600 },
  body: { size: 17, line: 22, tracking: -0.43, weight: 400 },
  callout: { size: 16, line: 21, tracking: -0.31, weight: 400 },
  subheadline: { size: 15, line: 20, tracking: -0.23, weight: 400 },
  footnote: { size: 13, line: 18, tracking: -0.08, weight: 400 },
  "caption-1": { size: 12, line: 16, tracking: 0, weight: 400 },
  "caption-2": { size: 11, line: 13, tracking: 0.06, weight: 400 },
} as const;

/** Spacing and corner radii (px) */
export const iosSpace = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const iosRadius = { xs: 5, s: 8, m: 12, l: 16, xl: 20, xxl: 26, bubble: 18, alert: 34, sheet: 38, full: 1000 } as const;

/** Component metrics (px) */
export const iosMetric = {
  inset: 16,
  rowHeight: 52,
  rowHeightTall: 68,
  sectionHeader: 42,
  toolbarTop: 54,
  toolbarTopLarge: 103,
  toolbarBottom: 80,
  tabBar: 95,
  navButton: 44,
  buttonSmall: 28,
  search: 48,
  segmented: 32,
  toggle: { width: 64, height: 28, knob: [39, 24] },
  grabber: { width: 58, height: 4, area: 15 },
  alert: { width: 300, padding: 14, gap: 10, button: 48 },
} as const;
