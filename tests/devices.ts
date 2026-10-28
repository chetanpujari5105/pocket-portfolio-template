import sizes from "./devices.json";

/*
 * The v5 device matrix: real screens plus the space a mobile browser actually leaves once its
 * toolbars are showing (tests/devices.json, also read by scripts/fit-shots.mjs).
 */
export type Size = { name: string; width: number; height: number; landscape?: boolean };

export const SIZES: Size[] = sizes;

export const slug = (s: Size) => `${s.width}x${s.height}`;
