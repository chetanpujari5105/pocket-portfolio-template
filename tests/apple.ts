import { expect, test, type Page } from "./fixtures";

/* Shared checks for the apps laid out like Settings (v11 Services and Platforms, v12 the rest):
 * no emoji, rows at least 44 px, nothing cut off at 360/390/430 with Larger Text on, and detail
 * views that push and swipe back from the left edge. */

/** Emoji; ©, ® and ™ are pictographic to Unicode but are plain text signs here (Credits uses ©). */
export const EMOJI = /(?![\u00a9\u00ae\u2122])\p{Extended_Pictographic}/u;
export const squash = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
export const app = (page: Page, name: string) => page.getByRole("dialog", { name });
export const view = (page: Page) => page.locator("[data-push-view]");

/** The lock screen shows once per session; these suites start unlocked. */
export function unlocked() {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
  });
}

/** Deep-link into an app and wait until the phone is still (3D swap done). */
export async function open(page: Page, hash: string) {
  await page.goto(`/#${hash}`);
  await expect(page.locator("[data-app-window] > [role=dialog]")).toBeVisible();
  await page.waitForFunction(() => innerWidth < 900 || document.documentElement.hasAttribute("data-3d"), null, { timeout: 25_000 });
  await page.waitForTimeout(600);
}

export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

/** Swipes the open detail view back from its left edge. */
export async function swipeBack(page: Page) {
  await page.waitForTimeout(600);
  const box = (await view(page).boundingBox())!;
  const y = box.y + box.height / 2;
  await drag(page, { x: box.x + 18, y }, { x: box.x + box.width * 0.75, y });
}

/** The visible text of the app window (or the pushed view), lower-cased and squashed. */
export async function textOf(page: Page, root: "app" | "view") {
  const el = root === "view" ? view(page) : page.locator("[data-app-window] > [role=dialog]").first();
  return squash((await el.textContent()) ?? "");
}

/** Text cut off inside `root` (ellipsis, a clamp or overflow), and grouped rows shorter than 44 px. */
export const layoutFaults = (page: Page, root: string) =>
  page.locator(root).evaluate((el) => {
    const clipped = [...el.querySelectorAll<HTMLElement>("h1, h2, li span, li a, li button, dd, dt, p, label, a, button")]
      .filter((n) => n.childElementCount === 0 && n.textContent?.trim() && n.offsetParent)
      // Screen-reader-only labels are clipped to 1 px on purpose
      .filter((n) => n.getBoundingClientRect().width > 1)
      .filter((n) => n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1)
      .map((n) => n.textContent!.trim());
    const scale = el.getBoundingClientRect().width / (el as HTMLElement).offsetWidth || 1;
    const short = [...el.querySelectorAll<HTMLElement>("ul[role=list] > li > :first-child")]
      .filter((r) => r.offsetParent && r.getBoundingClientRect().height / scale < 43.5)
      .map((r) => r.textContent!.trim());
    return { clipped, short };
  });

/** A screen to check: a hash, or one worked out on the page (a post that's in today's feed). */
type Screen = string | ((page: Page) => Promise<string>);

/**
 * Registers the fit checks for `screens`: light and dark, default and Larger Text; the phone project
 * also tries the narrowest and widest common phones.
 */
export function fitSuite(screens: Screen[]) {
  for (const scheme of ["light", "dark"] as const)
    for (const text of ["default", "large"] as const)
      test(`nothing is cut off and every row is at least 44 px (${scheme}, ${text} text)`, async ({ page }, info) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.addInitScript((size) => localStorage.setItem("pp-text", size), text);
        const widths = info.project.name === "phone" ? [360, 390, 430] : [0];
        for (const w of widths) {
          if (w) await page.setViewportSize({ width: w, height: 844 });
          for (const screen of screens) {
            const hash = typeof screen === "string" ? screen : await screen(page);
            await open(page, hash);
            const root = hash.includes("/") ? "[data-push-view]" : "[data-app-window] > [role=dialog]";
            const faults = await layoutFaults(page, root);
            expect(faults.clipped, `${hash} at ${w || "default"}: cut off`).toEqual([]);
            expect(faults.short, `${hash} at ${w || "default"}: rows under 44 px`).toEqual([]);
          }
        }
      });
}
