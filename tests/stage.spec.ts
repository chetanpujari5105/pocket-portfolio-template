import { expect, test, unpainted, type Page } from "./fixtures";

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

test("the camera control presses in while held and springs back, without turning the phone", async ({ page }) => {
  await ready(page);
  await expect(stage(page)).toHaveAttribute("data-camera-control-at", /^\d+,\d+$/);
  const [x, y] = (await stage(page).getAttribute("data-camera-control-at"))!.split(",").map(Number);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(stage(page)).toHaveAttribute("data-camera-control", "pressed");
  await page.waitForTimeout(250);
  await expect(stage(page)).toHaveAttribute("data-camera-control", "pressed");
  await page.mouse.up();
  await expect(stage(page)).toHaveAttribute("data-camera-control", "released");
  expect(await rotY(page)).toBe(0);
});

for (const scheme of ["light", "dark"] as const) {
  test(`home icons and widgets stay painted for 15 s, after the mouse moves and after a flip (${scheme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: scheme });
    await page.addInitScript(() => localStorage.setItem("pp-finish", "burgundy"));
    await ready(page);
    await expect(page.locator("html")).toHaveAttribute("data-awake", "");
    const sample = async (seconds: number) => {
      for (let t = 0; t < seconds * 2; t++) {
        expect(await unpainted(page)).toEqual([]);
        await page.waitForTimeout(500);
      }
    };
    await sample(15);
    await page.mouse.move(200, 300, { steps: 10 });
    await page.mouse.move(1200, 500, { steps: 10 });
    await sample(3);
    const flip = page.getByRole("button", { name: "Flip the phone" });
    await flip.click();
    await expect(stage(page)).toHaveAttribute("data-face", "back");
    await flip.click();
    await expect(stage(page)).toHaveAttribute("data-face", "front");
    await expect.poll(() => unpainted(page), { timeout: 3_000 }).toEqual([]);
    await sample(3);
    // Still skipped where it should be: page 2 is off to the side
    await expect(page.locator("[data-home-page='1']")).toHaveAttribute("data-offscreen", "");
  });
}

test("reduced motion keeps the flat CSS phone", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-app-icon]").first()).toBeVisible();
  await expect(page.locator("[data-stage]")).toHaveCount(0);
  await expect(page.locator(".phone-bezel [data-screen]")).toHaveCount(1);
});
