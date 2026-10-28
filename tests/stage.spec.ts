import { expect, test, type Page } from "./fixtures";

/* The 3D phone is the desktop default (≥ 900px, WebGL, motion allowed). Turning: stability.spec.ts. */

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "3D stage is desktop-only");
  test.setTimeout(60_000);
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

const stage = (page: Page) => page.locator("[data-stage]");
const rotY = async (page: Page) => Number(await stage(page).getAttribute("data-roty"));

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-3d", { timeout: 25_000 });
  await expect(stage(page).locator(".stage-canvas canvas")).toBeVisible();
  await expect(stage(page)).toHaveAttribute("data-face", "front");
}

/** A slow drag that comes to rest before release, so there is no flick inertia. */
async function drag(page: Page, from: [number, number], dx: number, steps = 16) {
  await page.mouse.move(...from);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from[0] + (dx * i) / steps, from[1]);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test("the screen lives in the 3D phone and stays clickable", async ({ page }) => {
  await ready(page);
  await expect(page.locator(".stage-screen [data-screen]")).toHaveCount(1);
  await page.getByRole("button", { name: "Open Courses", exact: true }).click();
  await expect(page).toHaveURL(/#courses$/);
});

test("drags that start on the screen never rotate the phone", async ({ page }) => {
  await ready(page);
  const screen = (await page.locator("[data-screen]").boundingBox())!;
  await drag(page, [screen.x + screen.width / 2, screen.y + screen.height * 0.75], 200);
  await page.waitForTimeout(300);
  expect(await rotY(page)).toBe(0);
});

test("reduced motion keeps the flat CSS phone", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-app-icon]").first()).toBeVisible();
  await expect(page.locator("[data-stage]")).toHaveCount(0);
  await expect(page.locator(".phone-bezel [data-screen]")).toHaveCount(1);
});
