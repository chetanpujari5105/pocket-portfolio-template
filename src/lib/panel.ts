
import { animateTo, fadeTransition, panelProgress, withVelocity } from "@/lib/motion";
import { prefersReducedMotion, useOS } from "@/lib/store";

/**
 * Settles Control Center open or closed, carrying a gesture's velocity (progress units per second).
 * Lives apart from the panel so Esc and Settings can close/open it before the panel's code loads.
 */
export function settlePanel(open: boolean, velocity = 0) {
  useOS.getState().setPanelOpen(open);
  if (prefersReducedMotion()) animateTo(panelProgress, open ? 1 : 0, fadeTransition);
  else animateTo(panelProgress, open ? 1 : 0, withVelocity(open ? "snappy" : "smooth", velocity));
}
