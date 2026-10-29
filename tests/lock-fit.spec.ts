import { expect, test, type Page } from "./fixtures";

/* The lock-screen clock always fits its screen: inside it with at least 4% to spare on each side,
 * under the date, which sits under the Dynamic Island. Every size, the widest and narrowest times,
 * Larger Text, reduced motion, and with the display font still on its way. */

const SIZES = [
  { name: "360x640", width: 360, height: 640 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "834x1112", width: 834, height: 1112 },
  { name: "1440x900 (3D phone)", width: 1440, height: 900 },
  { name: "844x390 landscape", width: 844, height: 390 },
  { name: "932x430 landscape", width: 932, height: 430 },
];
const TIMES: [number, number][] = [
  [1, 11],
  [10, 8],
  [12, 59],
  [2, 15],
];

type Box = { x: number; y: number; width: number; height: number };

/** Boxes of the screen, the stretched digits, the date and the Dynamic Island, as painted. */
async function boxes(page: Page) {
  return page.evaluate(() => {
    const box = (el: Element | null): Box | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const lock = document.querySelector("[data-lock]");
    return {
      screen: box(document.querySelector("[data-screen]")),
      digits: box(lock?.querySelector(".lock-digits") ?? null),
      date: box(lock?.querySelector(".lock-date") ?? null),
      island: box(document.querySelector(".status-pill")),
      text: lock?.querySelector(".lock-digits")?.textContent ?? "",
    };
  });
}

async function expectFits(page: Page, label: string, time: string) {
  await expect(page.locator("[data-lock] .lock-digits")).toHaveText(time);
  // Let the fit (a resize observer) and any font swap settle
  await page.waitForTimeout(250);
  const b = await boxes(page);
  const { screen, digits, date, island } = b;
  expect(screen && digits && date, label).toBeTruthy();
  const margin = screen!.width * 0.04;
  const at = `${label} ${time}`;
  expect(digits!.x - screen!.x, `${at}: left margin`).toBeGreaterThanOrEqual(margin);
  expect(screen!.x + screen!.width - (digits!.x + digits!.width), `${at}: right margin`).toBeGreaterThanOrEqual(margin);
  expect(digits!.y, `${at}: top`).toBeGreaterThanOrEqual(screen!.y);
  expect(digits!.y + digits!.height, `${at}: bottom`).toBeLessThanOrEqual(screen!.y + screen!.height);
  expect(digits!.y + 1, `${at}: under the date`).toBeGreaterThanOrEqual(date!.y + date!.height);
  if (island) expect(date!.y + 1, `${at}: date under the island`).toBeGreaterThanOrEqual(island.y + island.height);
}

async function lockAt(page: Page, [h, m]: [number, number], waitUntil: "load" | "domcontentloaded" = "load") {
  await page.clock.setFixedTime(new Date(2026, 9, 29, h, m, 5));
  await page.goto("/", { waitUntil });
  await expect(page.locator("[data-lock]")).toBeVisible();
}

const label = ([h, m]: [number, number]) => `${h % 12 || 12}:${String(m).padStart(2, "0")}`;

test.describe("lock clock fit", () => {
  // One project is enough: each case sets its own viewport
  test.beforeEach(() => test.skip(test.info().project.name !== "desktop", "viewport set per case"));
  test.describe.configure({ mode: "parallel" });

  for (const size of SIZES)
    test(`fits at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      for (const t of TIMES) {
        await lockAt(page, t);
        if (size.width >= 900 && size.height >= 520)
          await page.waitForFunction(() => document.documentElement.hasAttribute("data-3d"), null, { timeout: 25_000 });
        await expectFits(page, size.name, label(t));
      }
    });

  test("fits with Larger Text on", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("pp-text", "large"));
    for (const size of [SIZES[0], SIZES[1]]) {
      await page.setViewportSize({ width: size.width, height: size.height });
      for (const t of TIMES) {
        await lockAt(page, t);
        await expectFits(page, `${size.name} larger text`, label(t));
      }
    }
  });

  test("fits with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const size of [SIZES[1], SIZES[4]]) {
      await page.setViewportSize({ width: size.width, height: size.height });
      for (const t of TIMES) {
        await lockAt(page, t);
        await expectFits(page, `${size.name} reduced motion`, label(t));
      }
    }
  });

  test("fits while the display font is still loading", async ({ page }) => {
    // Hold every font file, so the clock lays out in the fallback face
    await page.route(/\.(woff2?|ttf)(\?|$)/, () => {});
    for (const size of [SIZES[0], SIZES[1], SIZES[5]]) {
      await page.setViewportSize({ width: size.width, height: size.height });
      for (const t of TIMES) {
        await lockAt(page, t, "domcontentloaded");
        await expectFits(page, `${size.name} fonts loading`, label(t));
      }
    }
  });
});
