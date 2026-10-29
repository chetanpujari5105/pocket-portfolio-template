import { test as base } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

export const test = base.extend<{ banner: boolean }>({
  // The once-per-session notification banner drops over the top of the screen 8 s in; tests that
  // aren't about it start with it already "shown".
  banner: [false, { option: true }],
  page: async ({ page, banner }, provide) => {
    if (!banner) await page.addInitScript(() => sessionStorage.setItem("pp-banner", "1"));
    // The 3D stage loads on the first sign of a visitor. Tests stand in for one with a no-op wheel
    // on the window (nothing else listens there), repeated until the stage is live.
    await page.addInitScript(() => {
      const id = window.setInterval(() => {
        if (innerWidth < 900 || document.documentElement.hasAttribute("data-3d")) return window.clearInterval(id);
        window.dispatchEvent(new WheelEvent("wheel"));
      }, 50);
      window.setTimeout(() => window.clearInterval(id), 20_000);
    });
    await provide(page);
  },
});

/**
 * Waits until the phone has finished arriving: awake, and on the desktop stage the live screen
 * has moved into the 3D phone. Tests that press things right after load use it, so a press
 * never lands mid-swap while the phone is still turning in.
 */
export async function settled(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => {
      const root = document.documentElement;
      const stage3D = matchMedia("(min-width: 900px) and (min-height: 520px) and (prefers-reduced-motion: no-preference)").matches;
      return root.hasAttribute("data-awake") && (!stage3D || root.hasAttribute("data-3d"));
    },
    null,
    { timeout: 25_000 },
  );
}

/**
 * Home entries on a page that aren't painted where they say they are: the centre of each slot
 * must hit-test to the slot itself. A page Chrome has wrongly skipped keeps its layout but stops
 * painting and hit-testing, so size, opacity and visibility checks alone would pass.
 */
export async function unpainted(page: import("@playwright/test").Page, homePage = 0) {
  return page.evaluate(
    (n) =>
      [...document.querySelectorAll<HTMLElement>(`[data-home-page='${n}'] [data-home-key]`)].flatMap((slot) => {
        const r = slot.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(r.height / 2, r.width / 2));
        return hit && slot.contains(hit) ? [] : [slot.dataset.homeKey!];
      }),
    homePage,
  );
}
