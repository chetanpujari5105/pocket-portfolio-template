import type { KeyboardEvent } from "react";

/**
 * Arrow keys move and select within a radiogroup (WAI-ARIA radio pattern).
 * Pair with `tabIndex={checked ? 0 : -1}` on each radio so the group is one tab stop.
 */
export function onRadioGroupKeyDown(event: KeyboardEvent<HTMLElement>) {
  const delta = (
    { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<
      string,
      number
    >
  )[event.key];
  if (!delta) return;
  const radios = [
    ...event.currentTarget.querySelectorAll<HTMLElement>("[role=radio]"),
  ];
  const i = radios.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  event.preventDefault();
  event.stopPropagation();
  const next = radios[(i + delta + radios.length) % radios.length];
  next.focus();
  next.click();
}
