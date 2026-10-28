"use client";

import { createContext, useContext } from "react";
import type { MotionValue } from "motion/react";

/**
 * Per-window motion shared with the views stacked inside an app: `push` (0 → 1 as a detail view
 * covers its parent) and `sheet` (0 → 1 as a sheet rises). The app's root screen reads both to step
 * back. `width` is the window's layout width in px.
 */
export type WindowMotion = { push: MotionValue<number>; sheet: MotionValue<number>; width: () => number };

export const WindowCtx = createContext<WindowMotion | null>(null);
export const useWindowMotion = () => useContext(WindowCtx);
