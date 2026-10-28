import { expect, test, type Page } from "./fixtures";

/* The lock screen: a fresh context starts a new session, so it shows; a reload keeps the session. */

const dialog = (page: Page) => page.locator("[data-app-window] > [role=dialog]");

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, opts: { steps?: number; hold?: number; delay?: number } = {}) {
  const { steps = 12, hold = 0, delay = 0 } = opts;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    if (delay) await page.waitForTimeout(delay);
  }
  if (hold) await page.waitForTimeout(hold);
  await page.mouse.up();
}

test.describe("lock screen", () => {
  test("a short drag springs back; swiping up past 30% unlocks, once per session", async ({ page }) => {
    await page.goto("/");
    const lock = page.locator("[data-lock]");
    await expect(lock).toBeVisible();
    const box = (await lock.boundingBox())!;
    const x = box.x + box.width / 2;
    await drag(page, { x, y: box.y + box.height * 0.8 }, { x, y: box.y + box.height * 0.7 }, { steps: 6, delay: 20, hold: 150 });
    await page.waitForTimeout(600);
    await expect(lock).toBeVisible();
    await drag(page, { x, y: box.y + box.height * 0.85 }, { x, y: box.y + box.height * 0.3 }, { steps: 10 });
    await expect(lock).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open Courses", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator("[data-app-icon]").first()).toBeVisible();
    await expect(page.locator("[data-lock]")).toBeHidden();
  });

  test("a tap or Enter unlocks; deep links skip the lock screen", async ({ page }) => {
    await page.goto("/#courses");
    await expect(page.locator("[data-lock]")).toBeHidden();
    await expect(dialog(page)).toBeVisible();
    await page.evaluate(() => sessionStorage.removeItem("pp-unlocked"));
    await page.goto("/");
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Swipe up to open" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-lock]")).toHaveCount(0);
  });
});

